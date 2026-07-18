const BLOCK_TAGS = new Set([
  'script',
  'style',
  'noscript',
  'template',
  'iframe',
  'svg',
  'head',
]);

const BLOCK_BREAK_TAGS = new Set([
  'p',
  'div',
  'br',
  'li',
  'tr',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'section',
  'article',
  'header',
  'footer',
  'main',
  'ul',
  'ol',
  'table',
]);

const ENTITY_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const isHex = entity[1]?.toLowerCase() === 'x';
      const code = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      if (Number.isFinite(code) && code > 0) {
        try {
          return String.fromCodePoint(code);
        } catch {
          return match;
        }
      }
      return match;
    }
    return ENTITY_MAP[entity.toLowerCase()] ?? match;
  });
}

/**
 * Lean HTML → plain text: strip scripts/styles, keep rough block structure.
 * Avoids bundling cheerio/linkedom into the parse Lambda.
 */
export function htmlToPlainText(html: string): string {
  let withoutComments = html.replace(/<!--[\s\S]*?-->/g, ' ');
  withoutComments = withoutComments.replace(
    /<(script|style|noscript|template|iframe|svg|head)\b[^>]*>[\s\S]*?<\/\1>/gi,
    ' ',
  );

  const withBreaks = withoutComments.replace(/<\/?([a-z0-9:-]+)(\s[^>]*)?>/gi, (tag, name: string) => {
    const lower = name.toLowerCase();
    if (BLOCK_TAGS.has(lower)) return ' ';
    if (BLOCK_BREAK_TAGS.has(lower) || tag.startsWith('<br')) return '\n';
    return ' ';
  });

  return decodeEntities(withBreaks)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
