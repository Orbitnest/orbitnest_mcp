export interface AppConfig {
  apiUrl: string;
  apiBasePath: string;
  serverName: string;
  serverVersion: string;
  logLevel: string;
  defaultProjectId: string | null;
  defaultEnvironment: 'development' | 'staging' | 'production';
  enableSqlGuard: boolean;
  requireDestructiveConfirmation: boolean;
  blockAuthTableMutations: boolean;
  schemaCacheTtl: number;
  tokenRefreshThreshold: number;
}
