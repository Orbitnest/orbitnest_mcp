import type { McpSession, DatabaseSchema, ProjectMetadata } from '../types/session.types.js';
import type { AppConfig } from '../types/config.types.js';
import { loadCredentials, saveCredentials } from './credentials.service.js';
import { needsRefresh, getTokenExpiry } from './token.service.js';
import { OrbitNestClient } from '../sdk/orbitnest.client.js';
import { AuthenticationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class SessionService {
  private session: McpSession;
  private config: AppConfig;
  private apiClient: OrbitNestClient;

  constructor(config: AppConfig, apiClient: OrbitNestClient) {
    this.config = config;
    this.apiClient = apiClient;
    this.session = {
      userId: null,
      email: null,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      currentProjectId: config.defaultProjectId,
      currentProjectSlug: null,
      environment: config.defaultEnvironment,
      schemaSnapshot: null,
      projectMetadata: null,
      apiUrl: config.apiUrl,
      safetyEnabled: config.enableSqlGuard,
    };
  }

  async initialize(): Promise<void> {
    const credentials = loadCredentials();
    if (credentials) {
      this.session.accessToken = credentials.access_token;
      this.session.refreshToken = credentials.refresh_token;
      this.session.tokenExpiresAt = new Date(credentials.expires_at);
      this.session.userId = credentials.user.id;
      this.session.email = credentials.user.email;
      this.apiClient.setAccessToken(credentials.access_token);
      logger.info('Session initialized from stored credentials', { email: credentials.user.email });
    } else {
      logger.info('No stored credentials found. Sign in required.');
    }
  }

  getSession(): McpSession {
    return this.session;
  }

  isAuthenticated(): boolean {
    if (!this.session.accessToken) return false;
    if (this.session.tokenExpiresAt && Date.now() >= this.session.tokenExpiresAt.getTime()) return false;
    return true;
  }

  async ensureAuthenticated(): Promise<void> {
    if (!this.session.accessToken) {
      throw new AuthenticationError();
    }

    if (this.session.accessToken && needsRefresh(this.session.accessToken, this.config.tokenRefreshThreshold)) {
      await this.refreshAccessToken();
    }
  }

  async refreshAccessToken(): Promise<void> {
    if (!this.session.refreshToken) {
      throw new AuthenticationError('No refresh token available. Please sign in again.');
    }

    try {
      logger.info('Refreshing access token...');
      const result = await this.apiClient.refreshToken(this.session.refreshToken);
      const accessToken = result.access_token as string;
      const expiresIn = result.expires_in as number;

      this.session.accessToken = accessToken;
      this.session.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
      this.apiClient.setAccessToken(accessToken);

      saveCredentials({
        access_token: accessToken,
        refresh_token: this.session.refreshToken,
        expires_at: this.session.tokenExpiresAt.toISOString(),
        user: { id: this.session.userId!, email: this.session.email! },
      });

      logger.info('Access token refreshed successfully');
    } catch (err) {
      logger.error('Token refresh failed', { error: String(err) });
      throw new AuthenticationError('Token refresh failed. Please sign in again.');
    }
  }

  setAuthFromSignin(data: Record<string, unknown>): void {
    const user = data.user as Record<string, string>;
    this.session.accessToken = data.access_token as string;
    this.session.refreshToken = data.refresh_token as string;
    this.session.userId = user.id;
    this.session.email = user.email;

    const expiresIn = data.expires_in as number;
    this.session.tokenExpiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : getTokenExpiry(this.session.accessToken) ?? new Date(Date.now() + 15 * 60 * 1000);

    this.apiClient.setAccessToken(this.session.accessToken);

    saveCredentials({
      access_token: this.session.accessToken,
      refresh_token: this.session.refreshToken,
      expires_at: this.session.tokenExpiresAt.toISOString(),
      user: { id: this.session.userId, email: this.session.email },
    });
  }

  setActiveProject(project: ProjectMetadata): void {
    this.session.currentProjectId = project.id;
    this.session.currentProjectSlug = project.slug;
    this.session.projectMetadata = project;
  }

  setSchemaSnapshot(schema: DatabaseSchema): void {
    this.session.schemaSnapshot = schema;
  }

  clearSession(): void {
    this.session.accessToken = null;
    this.session.refreshToken = null;
    this.session.tokenExpiresAt = null;
    this.session.userId = null;
    this.session.email = null;
    this.session.currentProjectId = null;
    this.session.currentProjectSlug = null;
    this.session.schemaSnapshot = null;
    this.session.projectMetadata = null;
  }
}
