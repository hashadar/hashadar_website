import { NextResponse } from 'next/server';
import {
  ORGANISER_COOKIE,
  ORGANISER_COOKIE_PATH,
} from '@/lib/court-board/request-context';
import { isValidOrganiserToken } from '@/lib/court-board/server-queries';

const ORGANISER_PAGE = '/labs/court-board/o';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
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
    response.cookies.set(ORGANISER_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: ORGANISER_COOKIE_PATH,
      maxAge: ONE_YEAR_SECONDS,
    });
  }

  return response;
}
