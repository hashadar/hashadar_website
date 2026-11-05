import { NextResponse } from 'next/server';
import {
  ORGANISER_COOKIE,
  organiserCookieOptions,
} from '@/lib/court-board/request-context';
import { isValidOrganiserToken } from '@/lib/court-board/server-queries';

const ORGANISER_PAGE = '/labs/court-board/o';

/**
 * Older-format links (`/o/<token>`). New links carry the token after `#`
 * instead (see `organiserTokenPath`), because a token in the path is written
 * to the hosting provider's access logs. Kept so links already shared work.
 *
 * Exchange an Organiser link's token for a cookie, then redirect so the token
 * leaves the address bar (and history). A wrong or replaced token gets the same
 * redirect with no cookie; the page then explains nothing beyond "not valid".
 * The Location is relative on purpose: behind a proxy `request.url` is not the
 * address the browser used. The token is never logged.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const response = new NextResponse(null, {
    status: 303,
    headers: {
      Location: ORGANISER_PAGE,
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });

  if (await isValidOrganiserToken(token)) {
    response.cookies.set(ORGANISER_COOKIE, token, organiserCookieOptions());
  }

  return response;
}
