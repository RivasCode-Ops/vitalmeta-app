export const COOKIE_NAME = "app_session_id";
export const REFRESH_COOKIE_NAME = "refresh_token";
export const ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
export const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';
