import { ApiError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import * as EP from './endpoints.js';

export interface OrbitNestClientConfig {
  apiUrl: string;
  accessToken: string;
}

export class OrbitNestClient {
  private baseUrl: string;
  private accessToken: string;

  constructor(config: OrbitNestClientConfig) {
    this.baseUrl = `${config.apiUrl}/api`;
    this.accessToken = config.accessToken;
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: { noAuth?: boolean; query?: Record<string, string> }
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (options?.query) {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(options.query).filter(([, v]) => v !== undefined && v !== ''))
      );
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!options?.noAuth && this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const fetchOptions: RequestInit = { method, headers };
    if (body !== undefined) {
      fetchOptions.body = JSON.stringify(body);
    }

    logger.debug(`API ${method} ${path}`);

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ message: response.statusText }));
      const msg = (errorBody as Record<string, string>).message || response.statusText;
      throw new ApiError(`API ${method} ${path} failed: ${msg}`, response.status);
    }

    const text = await response.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  }

  // ─── Authentication ───

  async signin(email: string, password: string) {
    return this.request<Record<string, unknown>>('POST', EP.AUTH.SIGNIN, { email, password }, { noAuth: true });
  }

  async signup(email: string, password: string, name?: string) {
    return this.request<Record<string, unknown>>('POST', EP.AUTH.SIGNUP, { email, password, name }, { noAuth: true });
  }

  async signupWithVerification(email: string, password: string, verificationCode: string) {
    return this.request<Record<string, unknown>>('POST', EP.AUTH.SIGNUP_WITH_VERIFICATION, {
      email, password, verification_code: verificationCode,
    }, { noAuth: true });
  }

  async requestVerification(email: string, password: string, name?: string) {
    return this.request<Record<string, unknown>>('POST', EP.AUTH.REQUEST_VERIFICATION, { email, password, name }, { noAuth: true });
  }

  async refreshToken(refreshToken: string) {
    return this.request<Record<string, unknown>>('POST', EP.AUTH.REFRESH, { refresh_token: refreshToken });
  }

  async signout(refreshToken: string) {
    return this.request<Record<string, unknown>>('POST', EP.AUTH.SIGNOUT, { refresh_token: refreshToken });
  }

  async getProfile() {
    return this.request<Record<string, unknown>>('GET', EP.AUTH.PROFILE);
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<Record<string, unknown>>('POST', EP.AUTH.CHANGE_PASSWORD, {
      current_password: currentPassword, new_password: newPassword,
    });
  }

  // ─── Admin Management ───

  async listAdmins() {
    return this.request<unknown[]>('GET', EP.ADMIN.LIST);
  }

  async createAdmin(data: { email: string; password: string; isActive?: boolean }) {
    return this.request<Record<string, unknown>>('POST', EP.ADMIN.CREATE, data);
  }

  async getAdmin(adminId: string) {
    return this.request<Record<string, unknown>>('GET', EP.ADMIN.GET(adminId));
  }

  async updateAdmin(adminId: string, data: { email?: string; isActive?: boolean }) {
    return this.request<Record<string, unknown>>('PATCH', EP.ADMIN.UPDATE(adminId), data);
  }

  async deleteAdmin(adminId: string) {
    return this.request<Record<string, unknown>>('DELETE', EP.ADMIN.DELETE(adminId));
  }

  async updateAdminPassword(adminId: string, newPassword: string) {
    return this.request<Record<string, unknown>>('PATCH', EP.ADMIN.UPDATE_PASSWORD(adminId), { new_password: newPassword });
  }

  // Admin Panel
  async getAdminProjects() {
    return this.request<unknown[]>('GET', EP.ADMIN.PROJECTS);
  }

  async getProjectOverview(projectId: string) {
    return this.request<Record<string, unknown>>('GET', EP.ADMIN.PROJECT_OVERVIEW(projectId));
  }

  async getProjectActivity(projectId: string, limit?: number) {
    const query: Record<string, string> = {};
    if (limit !== undefined) query['limit'] = String(limit);
    return this.request<unknown[]>('GET', EP.ADMIN.PROJECT_ACTIVITY(projectId), undefined, { query });
  }

  // ─── Projects ───

  async createProject(data: { name: string; description?: string }) {
    return this.request<Record<string, unknown>>('POST', EP.PROJECTS.CREATE, data);
  }

  async listProjects() {
    return this.request<unknown[]>('GET', EP.PROJECTS.LIST);
  }

  async getProject(projectId: string) {
    return this.request<Record<string, unknown>>('GET', EP.PROJECTS.GET(projectId));
  }

  async updateProject(projectId: string, data: Record<string, unknown>) {
    return this.request<Record<string, unknown>>('PATCH', EP.PROJECTS.UPDATE(projectId), data);
  }

  async deleteProject(projectId: string) {
    return this.request<Record<string, unknown>>('DELETE', EP.PROJECTS.DELETE(projectId));
  }

  async getProjectStats(projectId: string) {
    return this.request<Record<string, unknown>>('GET', EP.PROJECTS.STATS(projectId));
  }

  async getProjectHealth(projectId: string) {
    return this.request<Record<string, unknown>>('GET', EP.PROJECTS.HEALTH(projectId));
  }

  async toggleDebugMode(projectId: string, enabled: boolean) {
    return this.request<Record<string, unknown>>('PATCH', EP.PROJECTS.UPDATE(projectId), { is_debug_mode: enabled });
  }

  async createProjectApiKeys(projectId: string, data?: { name?: string; description?: string }) {
    return this.request<Record<string, unknown>>('POST', EP.PROJECTS.API_KEYS_CREATE(projectId), data);
  }

  async getProjectApiKeys(projectId: string) {
    return this.request<Record<string, unknown>>('GET', EP.PROJECTS.API_KEYS_LIST(projectId));
  }

  // ─── Database ───

  async executeSql(projectId: string, sql: string) {
    return this.request<Record<string, unknown>>('POST', EP.DATABASE.SQL(projectId), { sql });
  }

  async getTableMetadata(projectId: string, tableName?: string) {
    const query: Record<string, string> = {};
    if (tableName) query['table'] = tableName;
    return this.request<Record<string, unknown>>('GET', EP.DATABASE.TABLES(projectId), undefined, { query });
  }

  async listTables(projectId: string) {
    return this.request<Record<string, unknown>>('GET', EP.DATABASE.TABLES_LIST(projectId));
  }

  async deleteTable(projectId: string, tableName: string) {
    return this.request<Record<string, unknown>>('DELETE', EP.DATABASE.TABLE_DELETE(projectId, tableName));
  }

  async getTableData(
    projectId: string,
    tableName: string,
    opts?: { page?: number; limit?: number; offset?: number; orderBy?: string; orderDirection?: string; filter?: string }
  ) {
    const query: Record<string, string> = {};
    if (opts?.page !== undefined) query['page'] = String(opts.page);
    if (opts?.limit !== undefined) query['limit'] = String(opts.limit);
    if (opts?.offset !== undefined) query['offset'] = String(opts.offset);
    if (opts?.orderBy) query['orderBy'] = opts.orderBy;
    if (opts?.orderDirection) query['orderDirection'] = opts.orderDirection;
    if (opts?.filter) query['filter'] = opts.filter;
    return this.request<Record<string, unknown>>('GET', EP.DATABASE.TABLE_DATA(projectId, tableName), undefined, { query });
  }

  async insertRow(projectId: string, tableName: string, data: Record<string, unknown>) {
    return this.request<Record<string, unknown>>('POST', EP.DATABASE.INSERT_ROW(projectId, tableName), data);
  }

  async updateRow(projectId: string, tableName: string, rowId: string, data: Record<string, unknown>) {
    return this.request<Record<string, unknown>>('PUT', EP.DATABASE.UPDATE_ROW(projectId, tableName, rowId), data);
  }

  async deleteRow(projectId: string, tableName: string, rowId: string) {
    return this.request<Record<string, unknown>>('DELETE', EP.DATABASE.DELETE_ROW(projectId, tableName, rowId));
  }

  async bulkInsert(projectId: string, tableName: string, rows: Record<string, unknown>[]) {
    return this.request<Record<string, unknown>>('POST', EP.DATABASE.BULK_INSERT(projectId, tableName), { rows });
  }

  async bulkUpdate(projectId: string, tableName: string, rows: Record<string, unknown>[]) {
    return this.request<Record<string, unknown>>('PUT', EP.DATABASE.BULK_UPDATE(projectId, tableName), { rows });
  }

  async bulkDelete(projectId: string, tableName: string, ids: string[]) {
    return this.request<Record<string, unknown>>('DELETE', EP.DATABASE.BULK_DELETE(projectId, tableName), { ids });
  }

  // SQL History
  async getSqlHistory(projectId: string, opts?: { limit?: number; offset?: number; favorites?: boolean }) {
    const query: Record<string, string> = {};
    if (opts?.limit !== undefined) query['limit'] = String(opts.limit);
    if (opts?.offset !== undefined) query['offset'] = String(opts.offset);
    if (opts?.favorites !== undefined) query['favorites'] = String(opts.favorites);
    return this.request<unknown[]>('GET', EP.DATABASE.SQL_HISTORY(projectId), undefined, { query });
  }

  // ─── RLS ───

  async getRlsStatus(projectId: string, tableName: string) {
    return this.request<Record<string, unknown>>('GET', EP.RLS.GET_STATUS(projectId, tableName));
  }

  async enableRls(projectId: string, tableName: string) {
    return this.request<Record<string, unknown>>('POST', EP.RLS.ENABLE(projectId, tableName));
  }

  async disableRls(projectId: string, tableName: string) {
    return this.request<Record<string, unknown>>('POST', EP.RLS.DISABLE(projectId, tableName));
  }

  async listPolicies(projectId: string, tableName: string) {
    return this.request<unknown[]>('GET', EP.RLS.POLICIES(projectId, tableName));
  }

  async createPolicy(projectId: string, tableName: string, data: {
    policyName: string;
    command: string;
    using: string;
    withCheck?: string;
    roles?: string[];
  }) {
    return this.request<Record<string, unknown>>('POST', EP.RLS.POLICIES(projectId, tableName), data);
  }

  async deletePolicy(projectId: string, tableName: string, policyName: string) {
    return this.request<Record<string, unknown>>('DELETE', EP.RLS.DELETE_POLICY(projectId, tableName, policyName));
  }

  // ─── Edge Functions ───

  async createFunction(projectId: string, data: { name: string; description?: string; sourceCode: string; executionConfig?: { timeout?: number; memory?: number; enableLogs?: boolean } }) {
    return this.request<Record<string, unknown>>('POST', EP.FUNCTIONS.CREATE(projectId), data);
  }

  async listFunctions(projectId: string) {
    return this.request<unknown[]>('GET', EP.FUNCTIONS.LIST(projectId));
  }

  async getFunction(projectId: string, name: string) {
    return this.request<Record<string, unknown>>('GET', EP.FUNCTIONS.GET(projectId, name));
  }

  async updateFunction(projectId: string, name: string, data: { sourceCode?: string; description?: string; executionConfig?: { timeout?: number; memory?: number; enableLogs?: boolean } }) {
    return this.request<Record<string, unknown>>('PUT', EP.FUNCTIONS.UPDATE(projectId, name), data);
  }

  async deleteFunction(projectId: string, name: string) {
    return this.request<Record<string, unknown>>('DELETE', EP.FUNCTIONS.DELETE(projectId, name));
  }

  async invokeFunction(projectId: string, name: string, body?: unknown, method: string = 'POST') {
    return this.request<Record<string, unknown>>(method, EP.FUNCTIONS.INVOKE(projectId, name), body);
  }

  async getFunctionLogs(projectId: string, name: string, opts?: { limit?: number; startTime?: string; endTime?: string }) {
    const query: Record<string, string> = {};
    if (opts?.limit !== undefined) query['limit'] = String(opts.limit);
    if (opts?.startTime) query['startTime'] = opts.startTime;
    if (opts?.endTime) query['endTime'] = opts.endTime;
    return this.request<unknown[]>('GET', EP.FUNCTIONS.LOGS(projectId, name), undefined, { query });
  }

  // ─── Background Jobs ───

  async createJob(projectId: string, data: { name: string; description?: string; sourceCode: string; schedule: string; timezone?: string; executionConfig?: { timeout?: number; memory?: number; enableLogs?: boolean } }) {
    return this.request<Record<string, unknown>>('POST', EP.JOBS.CREATE(projectId), data);
  }

  async listJobs(projectId: string) {
    return this.request<unknown[]>('GET', EP.JOBS.LIST(projectId));
  }

  async getJob(projectId: string, name: string) {
    return this.request<Record<string, unknown>>('GET', EP.JOBS.GET(projectId, name));
  }

  async updateJob(projectId: string, name: string, data: { sourceCode?: string; description?: string; schedule?: string; timezone?: string; status?: string; executionConfig?: { timeout?: number; memory?: number; enableLogs?: boolean } }) {
    return this.request<Record<string, unknown>>('PUT', EP.JOBS.UPDATE(projectId, name), data);
  }

  async deleteJob(projectId: string, name: string) {
    return this.request<Record<string, unknown>>('DELETE', EP.JOBS.DELETE(projectId, name));
  }

  async triggerJob(projectId: string, name: string) {
    return this.request<Record<string, unknown>>('POST', EP.JOBS.TRIGGER(projectId, name));
  }

  async getJobRuns(projectId: string, name: string, opts?: { limit?: number }) {
    const query: Record<string, string> = {};
    if (opts?.limit !== undefined) query['limit'] = String(opts.limit);
    return this.request<unknown[]>('GET', EP.JOBS.RUNS(projectId, name), undefined, { query });
  }

  // ─── Environment Variables ───

  async getEnvVariables(projectId: string) {
    return this.request<unknown[]>('GET', EP.PROJECTS.ENV_VARS(projectId));
  }

  async createEnvVariable(projectId: string, data: { key: string; value: string; encrypted?: boolean }) {
    return this.request<Record<string, unknown>>('POST', EP.PROJECTS.ENV_VARS(projectId), {
      name: data.key,
      value: data.value,
      is_secret: data.encrypted,
    });
  }

  async updateEnvVariable(projectId: string, name: string, data: { key?: string; value?: string }) {
    return this.request<Record<string, unknown>>('PUT', EP.PROJECTS.ENV_VAR(projectId, name), data);
  }

  async deleteEnvVariable(projectId: string, name: string) {
    return this.request<Record<string, unknown>>('DELETE', EP.PROJECTS.ENV_VAR(projectId, name));
  }

  // ─── Admin Storage (uses projectId) ───

  async adminListBuckets(projectId: string) {
    return this.request<unknown[]>('GET', EP.ADMIN_STORAGE.LIST_BUCKETS(projectId));
  }

  async adminCreateBucket(projectId: string, data: { name: string; public?: boolean }) {
    return this.request<Record<string, unknown>>('POST', EP.ADMIN_STORAGE.CREATE_BUCKET(projectId), data);
  }

  async adminListFiles(projectId: string, bucketName: string, opts?: { prefix?: string; limit?: number; offset?: number }) {
    const query: Record<string, string> = {};
    if (opts?.prefix) query['prefix'] = opts.prefix;
    if (opts?.limit !== undefined) query['limit'] = String(opts.limit);
    if (opts?.offset !== undefined) query['offset'] = String(opts.offset);
    return this.request<unknown[]>('GET', EP.ADMIN_STORAGE.LIST_FILES(projectId, bucketName), undefined, { query });
  }

  async adminDeleteFiles(projectId: string, bucketName: string, paths: string[]) {
    return this.request<Record<string, unknown>>('DELETE', EP.ADMIN_STORAGE.DELETE_FILES(projectId, bucketName), { paths });
  }

  async adminUploadFile(projectId: string, bucketName: string, data: {
    filePath: string; fileContent: string; contentType?: string; upsert?: boolean;
  }) {
    return this.request<Record<string, unknown>>('POST', EP.ADMIN_STORAGE.UPLOAD(projectId, bucketName), data);
  }

  async adminGetBucketSize(projectId: string, bucketName: string) {
    return this.request<Record<string, unknown>>('GET', EP.ADMIN_STORAGE.BUCKET_SIZE(projectId, bucketName));
  }

  async adminDeleteBucket(projectId: string, bucketName: string) {
    return this.request<Record<string, unknown>>('DELETE', EP.ADMIN_STORAGE.DELETE_BUCKET(projectId, bucketName));
  }

  // ─── Storage (slug-based) ───

  async listBuckets(projectSlug: string) {
    return this.request<unknown[]>('GET', EP.STORAGE.LIST_BUCKETS(projectSlug));
  }

  async createBucket(projectSlug: string, bucketName: string, isPublic?: boolean) {
    return this.request<Record<string, unknown>>('POST', EP.STORAGE.CREATE_BUCKET(projectSlug, bucketName), { public: isPublic });
  }

  async deleteBucket(projectSlug: string, bucketName: string) {
    return this.request<Record<string, unknown>>('DELETE', EP.STORAGE.DELETE_BUCKET(projectSlug, bucketName));
  }

  async listFiles(projectSlug: string, bucketName: string, opts?: { prefix?: string; limit?: number }) {
    const query: Record<string, string> = {};
    if (opts?.prefix) query['prefix'] = opts.prefix;
    if (opts?.limit !== undefined) query['limit'] = String(opts.limit);
    return this.request<unknown[]>('GET', EP.STORAGE.LIST_FILES(projectSlug, bucketName), undefined, { query });
  }

  async uploadFile(projectSlug: string, bucketName: string, data: {
    filePath: string; fileContent: string; contentType?: string; upsert?: boolean;
  }) {
    return this.request<Record<string, unknown>>('POST', EP.STORAGE.UPLOAD(projectSlug, bucketName), data);
  }

  async downloadFile(projectSlug: string, bucketName: string, filePath: string) {
    return this.request<Record<string, unknown>>('GET', EP.STORAGE.DOWNLOAD(projectSlug, bucketName, filePath));
  }

  async deleteFiles(projectSlug: string, bucketName: string, paths: string[]) {
    return this.request<Record<string, unknown>>('DELETE', EP.STORAGE.DELETE_FILES(projectSlug, bucketName), { paths });
  }

  async getPublicUrl(projectSlug: string, bucketName: string, filePath: string) {
    return this.request<Record<string, unknown>>('GET', EP.STORAGE.PUBLIC_URL(projectSlug, bucketName, filePath));
  }

  async getBucketSize(projectSlug: string, bucketName: string) {
    return this.request<Record<string, unknown>>('GET', EP.STORAGE.BUCKET_SIZE(projectSlug, bucketName));
  }

  // ─── Logging ───

  async getLogs(projectId: string, opts?: { level?: string; search?: string; limit?: number; offset?: number; startTime?: string; endTime?: string }) {
    const query: Record<string, string> = {};
    if (opts?.level) query['level'] = opts.level;
    if (opts?.search) query['search'] = opts.search;
    if (opts?.limit !== undefined) query['limit'] = String(opts.limit);
    if (opts?.offset !== undefined) query['offset'] = String(opts.offset);
    if (opts?.startTime) query['startTime'] = opts.startTime;
    if (opts?.endTime) query['endTime'] = opts.endTime;
    return this.request<Record<string, unknown>>('GET', EP.LOGS.ALL(projectId), undefined, { query });
  }

  async getDatabaseLogs(projectId: string, opts?: { limit?: number }) {
    const query: Record<string, string> = {};
    if (opts?.limit !== undefined) query['limit'] = String(opts.limit);
    return this.request<Record<string, unknown>>('GET', EP.LOGS.DATABASE(projectId), undefined, { query });
  }

  async getSlowQueryLogs(projectId: string, opts?: { limit?: number }) {
    const query: Record<string, string> = {};
    if (opts?.limit !== undefined) query['limit'] = String(opts.limit);
    return this.request<Record<string, unknown>>('GET', EP.LOGS.DATABASE_SLOW(projectId), undefined, { query });
  }

  async getAuthLogs(projectId: string, opts?: { limit?: number }) {
    const query: Record<string, string> = {};
    if (opts?.limit !== undefined) query['limit'] = String(opts.limit);
    return this.request<Record<string, unknown>>('GET', EP.LOGS.AUTH(projectId), undefined, { query });
  }

  async getEdgeFunctionLogs(projectId: string, opts?: { limit?: number }) {
    const query: Record<string, string> = {};
    if (opts?.limit !== undefined) query['limit'] = String(opts.limit);
    return this.request<Record<string, unknown>>('GET', EP.LOGS.EDGE_FUNCTIONS(projectId), undefined, { query });
  }

  async exportLogs(projectId: string, opts?: { format?: string; startTime?: string; endTime?: string }) {
    const query: Record<string, string> = {};
    if (opts?.format) query['format'] = opts.format;
    if (opts?.startTime) query['startTime'] = opts.startTime;
    if (opts?.endTime) query['endTime'] = opts.endTime;
    return this.request<Record<string, unknown>>('GET', EP.LOGS.EXPORT(projectId), undefined, { query });
  }

  async getLogStats(projectId: string) {
    return this.request<Record<string, unknown>>('GET', EP.LOGS.STATS(projectId));
  }

  // ─── SMTP ───

  async getSmtpSettings(projectId: string) {
    return this.request<Record<string, unknown>>('GET', EP.PROJECTS.SMTP(projectId));
  }

  async updateSmtpSettings(projectId: string, data: Record<string, unknown>) {
    // Map camelCase tool params → snake_case API fields
    const payload: Record<string, unknown> = {};
    if (data.host !== undefined)      payload.smtp_host       = data.host;
    if (data.port !== undefined)      payload.smtp_port       = data.port;
    if (data.secure !== undefined)    payload.smtp_secure     = data.secure;
    if (data.username !== undefined)  payload.smtp_user       = data.username;
    if (data.password !== undefined)  payload.smtp_password   = data.password;
    if (data.fromEmail !== undefined) payload.smtp_from_email = data.fromEmail;
    if (data.fromName !== undefined)  payload.smtp_from_name  = data.fromName;
    return this.request<Record<string, unknown>>('PUT', EP.PROJECTS.SMTP(projectId), payload);
  }

  async deleteSmtpSettings(projectId: string) {
    return this.request<Record<string, unknown>>('DELETE', EP.PROJECTS.SMTP(projectId));
  }

  async testSmtpConnection(projectId: string, data: Record<string, unknown>) {
    return this.request<Record<string, unknown>>('POST', EP.PROJECTS.SMTP_TEST(projectId), data);
  }

  // ─── Dashboard ───

  async getDashboardStats() {
    return this.request<Record<string, unknown>>('GET', EP.DASHBOARD.STATS);
  }

  async getDashboardActivity() {
    return this.request<unknown[]>('GET', EP.DASHBOARD.ACTIVITY);
  }

  // ─── Realtime ───

  async listRealtimeTables(projectId: string) {
    return this.request<unknown[]>('GET', EP.REALTIME.TABLES(projectId));
  }

  async enableRealtimeTable(
    projectId: string,
    data: { table: string; schema?: string; columns?: string[] },
  ) {
    return this.request<Record<string, unknown>>(
      'POST',
      EP.REALTIME.TABLES(projectId),
      data,
    );
  }

  async disableRealtimeTable(
    projectId: string,
    schema: string,
    table: string,
  ) {
    return this.request<Record<string, unknown>>(
      'DELETE',
      EP.REALTIME.DISABLE_TABLE(projectId, schema, table),
    );
  }

  async broadcastRealtime(
    projectId: string,
    data: { channel: string; event: string; payload: unknown },
  ) {
    return this.request<{ ok: boolean }>(
      'POST',
      EP.REALTIME.BROADCAST(projectId),
      data,
    );
  }
}
