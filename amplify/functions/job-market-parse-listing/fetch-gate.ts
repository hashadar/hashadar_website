import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export const FETCH_TIMEOUT_MS = 20_000;
export const MAX_RESPONSE_BYTES = 1_000_000;
export const MIN_PLAIN_TEXT_CHARS = 200;
export const MAX_PLAIN_TEXT_CHARS = 12_000;
export const MAX_REDIRECTS = 5;
export const FETCH_NETWORK_RETRIES = 1;

/** Browser-like UA — many career sites reject non-browser clients with 403. */
export const FETCH_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export type FetchGateFailureReason =
  | 'invalid_url'
  | 'blocked_host'
  | 'timeout'
  | 'non_2xx'
  | 'empty_body'
  | 'content_too_short'
  | 'unsupported_content_type'
  | 'response_too_large'
  | 'network_error';

export type FetchGateResult =
  | { status: 'ok'; finalUrl: string; hostname: string; plainText: string }
  | { status: 'unfetchable'; reason: FetchGateFailureReason; detail?: string };

export type FetchHttpResponse = {
  status: number;
  headers: { get(name: string): string | null };
  url: string;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export type FetchHttp = (
  input: string,
  init: {
    method: string;
    headers: Record<string, string>;
    redirect: 'manual';
    signal: AbortSignal;
  },
) => Promise<FetchHttpResponse>;

export type ResolveHostAddresses = (hostname: string) => Promise<string[]>;

export type HtmlToPlainText = (html: string) => string;

export type FetchGateDeps = {
  fetchHttp?: FetchHttp;
  resolveHostAddresses?: ResolveHostAddresses;
  htmlToPlainText: HtmlToPlainText;
  now?: () => number;
};

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.goog',
]);

function isPrivateOrLinkLocalIpv4(address: string): boolean {
  const parts = address.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return true;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isPrivateOrLinkLocalIpv6(address: string): boolean {
  const normalised = address.toLowerCase();
  if (normalised === '::1' || normalised === '::') return true;
  if (normalised.startsWith('fc') || normalised.startsWith('fd')) return true; // ULA
  if (normalised.startsWith('fe8') || normalised.startsWith('fe9')) return true;
  if (normalised.startsWith('fea') || normalised.startsWith('feb')) return true;
  return false;
}

export function isBlockedIpAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPrivateOrLinkLocalIpv4(address);
  if (version === 6) return isPrivateOrLinkLocalIpv6(address);
  return true;
}

export function isBlockedHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, '');
  if (!host) return true;
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (host.endsWith('.localhost') || host.endsWith('.local')) return true;
  if (isIP(host) && isBlockedIpAddress(host)) return true;
  return false;
}

async function defaultResolveHostAddresses(hostname: string): Promise<string[]> {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
}

function parseHttpsUrl(raw: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  if (!parsed.hostname) return null;
  return parsed;
}

function isHtmlContentType(contentType: string | null): boolean {
  if (!contentType) return true; // many ATS omit Content-Type; allow and rely on body checks
  const lower = contentType.toLowerCase();
  return (
    lower.includes('text/html') ||
    lower.includes('application/xhtml') ||
    lower.includes('text/plain')
  );
}

function looksLikeLoginWall(plainText: string): boolean {
  const sample = plainText.slice(0, 800).toLowerCase();
  const signals = [
    'sign in to continue',
    'log in to continue',
    'please log in',
    'please sign in',
    'authentication required',
    'enable javascript and cookies',
  ];
  return signals.some((signal) => sample.includes(signal)) && plainText.length < 600;
}

async function assertHostAllowed(
  hostname: string,
  resolveHostAddresses: ResolveHostAddresses,
): Promise<FetchGateFailureReason | null> {
  if (isBlockedHostname(hostname)) {
    return 'blocked_host';
  }
  if (isIP(hostname)) {
    return isBlockedIpAddress(hostname) ? 'blocked_host' : null;
  }
  try {
    const addresses = await resolveHostAddresses(hostname);
    if (addresses.length === 0 || addresses.some(isBlockedIpAddress)) {
      return 'blocked_host';
    }
  } catch {
    return 'network_error';
  }
  return null;
}

/**
 * HTTPS fetch with SSRF denylist, size/timeout limits, and HTML→text gate.
 * Callers must not invoke Bedrock when status is unfetchable.
 */
export async function fetchCareerPageText(
  rawUrl: string,
  deps: FetchGateDeps,
): Promise<FetchGateResult> {
  const fetchHttp = deps.fetchHttp ?? (globalThis.fetch as unknown as FetchHttp);
  const resolveHostAddresses = deps.resolveHostAddresses ?? defaultResolveHostAddresses;

  let current = parseHttpsUrl(rawUrl);
  if (!current) {
    return { status: 'unfetchable', reason: 'invalid_url' };
  }

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const hostBlock = await assertHostAllowed(current.hostname, resolveHostAddresses);
    if (hostBlock) {
      return { status: 'unfetchable', reason: hostBlock };
    }

    let response: FetchHttpResponse | undefined;
    let lastNetworkFailure: FetchGateResult | undefined;

    for (let attempt = 0; attempt <= FETCH_NETWORK_RETRIES; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        response = await fetchHttp(current.toString(), {
          method: 'GET',
          headers: {
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-GB,en;q=0.9',
            'Cache-Control': 'no-cache',
            'User-Agent': FETCH_USER_AGENT,
          },
          redirect: 'manual',
          signal: controller.signal,
        });
        lastNetworkFailure = undefined;
        break;
      } catch (error) {
        const aborted =
          (error instanceof Error && error.name === 'AbortError') ||
          (typeof error === 'object' &&
            error !== null &&
            'name' in error &&
            (error as { name: string }).name === 'AbortError');
        lastNetworkFailure = {
          status: 'unfetchable',
          reason: aborted ? 'timeout' : 'network_error',
          detail: error instanceof Error ? error.message : undefined,
        };
        if (aborted || attempt === FETCH_NETWORK_RETRIES) {
          return lastNetworkFailure;
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    if (!response) {
      return (
        lastNetworkFailure ?? {
          status: 'unfetchable',
          reason: 'network_error',
        }
      );
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location || redirectCount === MAX_REDIRECTS) {
        return { status: 'unfetchable', reason: 'network_error', detail: 'Too many redirects' };
      }
      try {
        current = new URL(location, current);
      } catch {
        return { status: 'unfetchable', reason: 'invalid_url' };
      }
      if (current.protocol !== 'https:') {
        return { status: 'unfetchable', reason: 'invalid_url', detail: 'Redirect left HTTPS' };
      }
      continue;
    }

    if (response.status < 200 || response.status >= 300) {
      return {
        status: 'unfetchable',
        reason: 'non_2xx',
        detail: `HTTP ${response.status}`,
      };
    }

    if (!isHtmlContentType(response.headers.get('content-type'))) {
      return { status: 'unfetchable', reason: 'unsupported_content_type' };
    }

    let buffer: ArrayBuffer;
    try {
      buffer = await response.arrayBuffer();
    } catch (error) {
      return {
        status: 'unfetchable',
        reason: 'network_error',
        detail: error instanceof Error ? error.message : undefined,
      };
    }

    if (buffer.byteLength === 0) {
      return { status: 'unfetchable', reason: 'empty_body' };
    }
    if (buffer.byteLength > MAX_RESPONSE_BYTES) {
      return { status: 'unfetchable', reason: 'response_too_large' };
    }

    const html = new TextDecoder('utf-8').decode(buffer);
    const plainText = deps.htmlToPlainText(html).trim();
    if (!plainText) {
      return { status: 'unfetchable', reason: 'empty_body' };
    }
    if (plainText.length < MIN_PLAIN_TEXT_CHARS || looksLikeLoginWall(plainText)) {
      return { status: 'unfetchable', reason: 'content_too_short' };
    }

    const truncated =
      plainText.length > MAX_PLAIN_TEXT_CHARS
        ? plainText.slice(0, MAX_PLAIN_TEXT_CHARS)
        : plainText;

    return {
      status: 'ok',
      finalUrl: current.toString(),
      hostname: current.hostname,
      plainText: truncated,
    };
  }

  return { status: 'unfetchable', reason: 'network_error', detail: 'Too many redirects' };
}
