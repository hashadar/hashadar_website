export const PRIVACY_PATH = '/labs/court-board/privacy';

/** The Club rules for a Session's Club; the Session id is the capability link. */
export const rulesPath = (sessionId: string) => `/labs/court-board/s/${sessionId}/rules`;

export const sessionPath = (sessionId: string) => `/labs/court-board/s/${sessionId}`;
