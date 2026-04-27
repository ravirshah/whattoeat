import 'server-only';
import {
  type EightSleepDay,
  EightSleepTokenResponse,
  EightSleepTrendsResponse,
  EightSleepUserMeResponse,
} from './schema';

/**
 * Eight Sleep does not publish a public API. Endpoints, default client creds,
 * and User-Agent below are reverse-engineered from the official Android app
 * v7.39.17 (mirrors steipete/eightctl). They may break without warning; treat
 * the integration as best-effort.
 */

const AUTH_URL = 'https://auth-api.8slp.net/v1/tokens';
const CLIENT_API_BASE = 'https://client-api.8slp.net/v1';

const DEFAULT_CLIENT_ID = '0894c7f33bb94800a03f1f4df13a4f38';
const DEFAULT_CLIENT_SECRET = 'f0954a3ed5763ba3d06834c73731a32f15f168f47d4f164751275def86db0c76';
const DEFAULT_USER_AGENT = 'okhttp/4.9.3';

export class EightSleepError extends Error {
  constructor(
    public readonly code: 'auth' | 'rate_limited' | 'unauthorized' | 'http' | 'parse',
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'EightSleepError';
  }
}

export interface EightSleepClientOptions {
  fetchImpl?: typeof fetch;
  clientId?: string;
  clientSecret?: string;
  userAgent?: string;
  authUrl?: string;
  apiBase?: string;
  now?: () => Date;
}

export interface AuthResult {
  access_token: string;
  /** ISO timestamp 60s before the server-reported expiry, to give callers a safety margin. */
  expires_at: string;
  userId: string | null;
}

export interface MeResult {
  userId: string;
  currentDeviceId: string | null;
}

export class EightSleepClient {
  private readonly fetchImpl: typeof fetch;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly userAgent: string;
  private readonly authUrl: string;
  private readonly apiBase: string;
  private readonly now: () => Date;

  constructor(opts: EightSleepClientOptions = {}) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.clientId = opts.clientId ?? process.env.EIGHT_SLEEP_CLIENT_ID ?? DEFAULT_CLIENT_ID;
    this.clientSecret =
      opts.clientSecret ?? process.env.EIGHT_SLEEP_CLIENT_SECRET ?? DEFAULT_CLIENT_SECRET;
    this.userAgent = opts.userAgent ?? DEFAULT_USER_AGENT;
    this.authUrl = opts.authUrl ?? AUTH_URL;
    this.apiBase = opts.apiBase ?? CLIENT_API_BASE;
    this.now = opts.now ?? (() => new Date());
  }

  async authenticate(email: string, password: string): Promise<AuthResult> {
    const body = new URLSearchParams({
      grant_type: 'password',
      username: email,
      password,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const resp = await this.fetchImpl(this.authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': this.userAgent,
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    if (resp.status === 429) {
      throw new EightSleepError('rate_limited', 'Eight Sleep auth rate limited', 429);
    }
    if (!resp.ok) {
      const text = await safeText(resp);
      throw new EightSleepError(
        'auth',
        `Eight Sleep auth failed (${resp.status}): ${text.slice(0, 200)}`,
        resp.status,
      );
    }

    const json = await resp.json().catch(() => {
      throw new EightSleepError('parse', 'Eight Sleep auth response was not valid JSON');
    });
    const parsed = EightSleepTokenResponse.safeParse(json);
    if (!parsed.success) {
      throw new EightSleepError(
        'parse',
        `Eight Sleep auth payload invalid: ${parsed.error.message}`,
      );
    }
    const { access_token, expires_in, userId } = parsed.data;
    const expiresAt = new Date(this.now().getTime() + Math.max(60, expires_in - 60) * 1000);
    return {
      access_token,
      expires_at: expiresAt.toISOString(),
      userId: userId ?? null,
    };
  }

  async getMe(accessToken: string): Promise<MeResult> {
    const json = await this.apiGet(accessToken, '/users/me');
    const parsed = EightSleepUserMeResponse.safeParse(json);
    if (!parsed.success) {
      throw new EightSleepError('parse', `users/me payload invalid: ${parsed.error.message}`);
    }
    return {
      userId: parsed.data.user.userId,
      currentDeviceId: parsed.data.user.currentDevice?.id ?? null,
    };
  }

  /**
   * Fetch sleep aggregates for a date range. Returns days oldest→newest.
   * `from` and `to` are ISO dates (YYYY-MM-DD).
   */
  async getTrends(
    accessToken: string,
    userId: string,
    opts: { from: string; to: string; timezone: string },
  ): Promise<EightSleepDay[]> {
    const q = new URLSearchParams({
      from: opts.from,
      to: opts.to,
      tz: opts.timezone,
      'include-main': 'false',
      'include-all-sessions': 'true',
      'model-version': 'v2',
    });
    const json = await this.apiGet(accessToken, `/users/${encodeURIComponent(userId)}/trends?${q}`);
    const parsed = EightSleepTrendsResponse.safeParse(json);
    if (!parsed.success) {
      throw new EightSleepError('parse', `trends payload invalid: ${parsed.error.message}`);
    }
    return parsed.data.days;
  }

  private async apiGet(accessToken: string, pathWithQuery: string): Promise<unknown> {
    const url = `${this.apiBase}${pathWithQuery}`;
    const resp = await this.fetchImpl(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': this.userAgent,
        Accept: 'application/json',
        Connection: 'keep-alive',
      },
    });
    if (resp.status === 401) {
      throw new EightSleepError('unauthorized', 'Eight Sleep token rejected', 401);
    }
    if (resp.status === 429) {
      throw new EightSleepError('rate_limited', 'Eight Sleep rate limited', 429);
    }
    if (!resp.ok) {
      const text = await safeText(resp);
      throw new EightSleepError(
        'http',
        `Eight Sleep ${resp.status} on ${pathWithQuery}: ${text.slice(0, 200)}`,
        resp.status,
      );
    }
    return resp.json().catch(() => {
      throw new EightSleepError('parse', `Eight Sleep response was not JSON: ${pathWithQuery}`);
    });
  }
}

async function safeText(resp: Response): Promise<string> {
  try {
    return await resp.text();
  } catch {
    return '';
  }
}
