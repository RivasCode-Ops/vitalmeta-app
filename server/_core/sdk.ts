import { nanoid } from "nanoid";
import { AXIOS_TIMEOUT_MS, COOKIE_NAME, REFRESH_COOKIE_NAME, ACCESS_TOKEN_EXPIRY_MS, REFRESH_TOKEN_EXPIRY_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import axios, { type AxiosInstance } from "axios";
import { parse as parseCookieHeader } from "cookie";
import type { Request, Response } from "express";
import { SignJWT, jwtVerify, decodeJwt, errors as joseErrors } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import { getSessionCookieOptions, getRefreshCookieOptions } from "./cookies";
import type {
  ExchangeTokenRequest,
  ExchangeTokenResponse,
  GetUserInfoResponse,
  GetUserInfoWithJwtRequest,
  GetUserInfoWithJwtResponse,
} from "./types/manusTypes";
// Utility function
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
  jti?: string;
};

const EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
const GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
const GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;

class OAuthService {
  constructor(private client: ReturnType<typeof axios.create>) {
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }

  private decodeState(state: string): string {
    const redirectUri = atob(state);
    return redirectUri;
  }

  async getTokenByCode(
    code: string,
    state: string
  ): Promise<ExchangeTokenResponse> {
    const payload: ExchangeTokenRequest = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state),
    };

    const { data } = await this.client.post<ExchangeTokenResponse>(
      EXCHANGE_TOKEN_PATH,
      payload
    );

    return data;
  }

  async getUserInfoByToken(
    token: ExchangeTokenResponse
  ): Promise<GetUserInfoResponse> {
    const { data } = await this.client.post<GetUserInfoResponse>(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken,
      }
    );

    return data;
  }
}

const createOAuthHttpClient = (): AxiosInstance =>
  axios.create({
    baseURL: ENV.oAuthServerUrl,
    timeout: AXIOS_TIMEOUT_MS,
  });

class SDKServer {
  private readonly client: AxiosInstance;
  private readonly oauthService: OAuthService;

  constructor(client: AxiosInstance = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }

  private deriveLoginMethod(
    platforms: unknown,
    fallback: string | null | undefined
  ): string | null {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set<string>(
      platforms.filter((p): p is string => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (
      set.has("REGISTERED_PLATFORM_MICROSOFT") ||
      set.has("REGISTERED_PLATFORM_AZURE")
    )
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }

  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(
    code: string,
    state: string
  ): Promise<ExchangeTokenResponse> {
    return this.oauthService.getTokenByCode(code, state);
  }

  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken: string): Promise<GetUserInfoResponse> {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken,
    } as ExchangeTokenResponse);
    const loginMethod = this.deriveLoginMethod(
      (data as any)?.platforms,
      (data as any)?.platform ?? data.platform ?? null
    );
    return {
      ...(data as any),
      platform: loginMethod,
      loginMethod,
    } as GetUserInfoResponse;
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }

    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }

  /**
   * Create a short-lived access JWT (default 15 min)
   * @example
   * const accessToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || "",
      },
      { expiresInMs: options.expiresInMs ?? ACCESS_TOKEN_EXPIRY_MS }
    );
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<{ payload: { openId: string; appId: string; name: string } | null; expired: boolean }> {
    if (!cookieValue) {
      return { payload: null, expired: false };
    }

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { openId, appId, name } = payload as Record<string, unknown>;

      if (
        !isNonEmptyString(openId) ||
        !isNonEmptyString(appId) ||
        !isNonEmptyString(name)
      ) {
        return { payload: null, expired: false };
      }

      return {
        payload: { openId, appId, name },
        expired: false,
      };
    } catch (error) {
      if (error instanceof joseErrors.JWTExpired) {
        return { payload: null, expired: true };
      }
      return { payload: null, expired: false };
    }
  }

  async getUserInfoWithJwt(
    jwtToken: string
  ): Promise<GetUserInfoWithJwtResponse> {
    const payload: GetUserInfoWithJwtRequest = {
      jwtToken,
      projectId: ENV.appId,
    };

    const { data } = await this.client.post<GetUserInfoWithJwtResponse>(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );

    const loginMethod = this.deriveLoginMethod(
      (data as any)?.platforms,
      (data as any)?.platform ?? data.platform ?? null
    );
    return {
      ...(data as any),
      platform: loginMethod,
      loginMethod,
    } as GetUserInfoWithJwtResponse;
  }

  async createRefreshToken(userId: number): Promise<string> {
    const jti = nanoid(32);
    const expiresAt = Date.now() + REFRESH_TOKEN_EXPIRY_MS;
    await db.createRefreshToken({ userId, jti, expiresAt });
    return jti;
  }

  /** Decode an expired JWT without signature verification (openId extraction only) */
  decodeExpiredToken(token: string | null | undefined): { openId?: string } | null {
    if (!token) return null;
    try {
      const payload = decodeJwt(token);
      return { openId: typeof payload.openId === "string" ? payload.openId : undefined };
    } catch {
      return null;
    }
  }

  async rotateRefreshTokenPair(
    refreshTokenJti: string
  ): Promise<{ accessToken: string; refreshToken: string; userId: number }> {
    const stored = await db.findRefreshTokenByJti(refreshTokenJti);
    if (!stored || stored.rotatedAt || stored.expiresAt < Date.now()) {
      // Detect replay: if already rotated, revoke all user tokens
      if (stored?.rotatedAt) {
        await db.revokeUserRefreshTokens(stored.userId);
      }
      throw new Error("Invalid or expired refresh token");
    }

    await db.markRefreshTokenRotated(refreshTokenJti);

    const user = await db.getUserById(stored.userId);
    if (!user) throw new Error("User not found");

    const accessToken = await this.createSessionToken(user.openId, { name: user.name ?? undefined });
    const refreshToken = await this.createRefreshToken(stored.userId);
    return { accessToken, refreshToken, userId: stored.userId };
  }

  async authenticateRequest(req: Request, res?: Response): Promise<User> {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    let result = await this.verifySession(sessionCookie);

    // Auto-refresh if access JWT expired and refresh token available
    if (result.expired && res) {
      const refreshCookie = cookies.get(REFRESH_COOKIE_NAME);
      if (refreshCookie) {
        try {
          const newTokens = await this.rotateRefreshTokenPair(refreshCookie);
          const accessOpts = getSessionCookieOptions(req);
          const refreshOpts = getRefreshCookieOptions(req);
          res.cookie(COOKIE_NAME, newTokens.accessToken, { ...accessOpts, maxAge: ACCESS_TOKEN_EXPIRY_MS });
          res.cookie(REFRESH_COOKIE_NAME, newTokens.refreshToken, { ...refreshOpts, maxAge: REFRESH_TOKEN_EXPIRY_MS });
          result = await this.verifySession(newTokens.accessToken);
        } catch {
          // Refresh failed, user stays null
        }
      }
    }

    if (!result.payload) {
      throw ForbiddenError("Invalid session cookie");
    }

    const sessionUserId = result.payload.openId;
    const signedInAt = new Date();
    let user = await db.getUserByOpenId(sessionUserId);

    // If user not in DB, sync from OAuth server automatically
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await db.upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt,
        });
        user = await db.getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }

    if (!user) {
      throw ForbiddenError("User not found");
    }

    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt,
    });

    return user;
  }
}

export const sdk = new SDKServer();
