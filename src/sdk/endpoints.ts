// Authentication
export const AUTH = {
  SIGNIN: '/auth/signin',
  SIGNUP: '/auth/signup',
  SIGNUP_WITH_VERIFICATION: '/auth/signup-with-verification',
  REQUEST_VERIFICATION: '/auth/request-verification',
  REFRESH: '/auth/refresh',
  SIGNOUT: '/auth/signout',
  PROFILE: '/auth/profile',
  RESET_PASSWORD_REQUEST: '/auth/reset-password-request',
  RESET_PASSWORD: '/auth/reset-password',
  CHANGE_PASSWORD: '/auth/change-password',
} as const;

// Admin Management
export const ADMIN = {
  LIST: '/admin/admins',
  CREATE: '/admin/admins',
  GET: (id: string) => `/admin/admins/${id}`,
  UPDATE: (id: string) => `/admin/admins/${id}`,
  DELETE: (id: string) => `/admin/admins/${id}`,
  UPDATE_PASSWORD: (id: string) => `/admin/admins/${id}/password`,
  API_KEYS_CREATE: '/admin/api-keys',
  API_KEYS_LIST: '/admin/api-keys',
  API_KEYS_DELETE: (id: string) => `/admin/api-keys/${id}`,
  // Admin panel
  PROJECTS: '/admin/projects',
  PROJECT_OVERVIEW: (id: string) => `/admin/projects/${id}/overview`,
  PROJECT_ACTIVITY: (id: string) => `/admin/projects/${id}/activity/recent`,
  PROJECT_AUTH_ACTIVITY: (id: string) => `/admin/projects/${id}/activity/auth`,
} as const;

// Admin Storage (uses projectId, not slug)
export const ADMIN_STORAGE = {
  LIST_BUCKETS: (id: string) => `/admin/projects/${id}/storage/buckets`,
  CREATE_BUCKET: (id: string) => `/admin/projects/${id}/storage/buckets`,
  LIST_FILES: (id: string, bucket: string) => `/admin/projects/${id}/storage/buckets/${bucket}/files`,
  DELETE_FILES: (id: string, bucket: string) => `/admin/projects/${id}/storage/buckets/${bucket}/files`,
  UPLOAD: (id: string, bucket: string) => `/admin/projects/${id}/storage/buckets/${bucket}/upload`,
  UPLOAD_MULTIPLE: (id: string, bucket: string) => `/admin/projects/${id}/storage/buckets/${bucket}/upload-multiple`,
  BUCKET_SIZE: (id: string, bucket: string) => `/admin/projects/${id}/storage/buckets/${bucket}/size`,
  DELETE_BUCKET: (id: string, bucket: string) => `/admin/projects/${id}/storage/buckets/${bucket}`,
} as const;

// Projects
export const PROJECTS = {
  CREATE: '/projects',
  LIST: '/projects',
  GET: (id: string) => `/projects/${id}`,
  UPDATE: (id: string) => `/projects/${id}`,
  DELETE: (id: string) => `/projects/${id}`,
  STATS: (id: string) => `/projects/${id}/stats`,
  HEALTH: (id: string) => `/projects/${id}/health`,
  DEBUG_MODE: (id: string) => `/projects/${id}/debug-mode`,
  DECRYPTION_KEY: '/projects/decryption-key',
  API_KEYS_CREATE: (id: string) => `/projects/${id}/api-keys`,
  API_KEYS_LIST: (id: string) => `/projects/${id}/api-keys`,
  API_KEYS_DELETE: (id: string, keyId: string) => `/projects/${id}/api-keys/${keyId}`,
  ENV_VARS: (id: string) => `/projects/${id}/environment-variables`,
  ENV_VAR: (id: string, name: string) => `/projects/${id}/environment-variables/${name}`,
  ENV_VARS_BULK: (id: string) => `/projects/${id}/environment-variables/bulk`,
  SMTP: (id: string) => `/projects/${id}/smtp`,
  SMTP_TEST: (id: string) => `/projects/${id}/smtp/test`,
} as const;

// Database
export const DATABASE = {
  SQL: (id: string) => `/projects/${id}/database/sql`,
  SQL_HISTORY: (id: string) => `/projects/${id}/database/sql/history`,
  SQL_HISTORY_ITEM: (id: string, historyId: string) => `/projects/${id}/database/sql/history/${historyId}`,
  SQL_HISTORY_FAVORITE: (id: string, historyId: string) => `/projects/${id}/database/sql/history/${historyId}/favorite`,
  SQL_HISTORY_NAME: (id: string, historyId: string) => `/projects/${id}/database/sql/history/${historyId}/name`,
  TABLES: (id: string) => `/projects/${id}/database/tables`,
  TABLES_LIST: (id: string) => `/projects/${id}/database/tables/list`,
  TABLE_DELETE: (id: string, table: string) => `/projects/${id}/database/tables/${table}`,
  TABLE_DATA: (id: string, table: string) => `/projects/${id}/database/tables/${table}/data`,
  INSERT_ROW: (id: string, table: string) => `/projects/${id}/database/tables/${table}/rows`,
  UPDATE_ROW: (id: string, table: string, rowId: string) => `/projects/${id}/database/tables/${table}/rows/${rowId}`,
  DELETE_ROW: (id: string, table: string, rowId: string) => `/projects/${id}/database/tables/${table}/rows/${rowId}`,
  BULK_INSERT: (id: string, table: string) => `/projects/${id}/database/tables/${table}/bulk-insert`,
  BULK_UPDATE: (id: string, table: string) => `/projects/${id}/database/tables/${table}/bulk-update`,
  BULK_DELETE: (id: string, table: string) => `/projects/${id}/database/tables/${table}/bulk-delete`,
} as const;

// RLS (nested under /database/tables/{tableName})
export const RLS = {
  GET_STATUS: (id: string, table: string) => `/projects/${id}/database/rls/${table}`,
  ENABLE: (id: string, table: string) => `/projects/${id}/database/tables/${table}/rls/enable`,
  DISABLE: (id: string, table: string) => `/projects/${id}/database/tables/${table}/rls/disable`,
  POLICIES: (id: string, table: string) => `/projects/${id}/database/tables/${table}/policies`,
  DELETE_POLICY: (id: string, table: string, policy: string) => `/projects/${id}/database/tables/${table}/policies/${policy}`,
} as const;

// Edge Functions
export const FUNCTIONS = {
  CREATE: (id: string) => `/projects/${id}/functions`,
  LIST: (id: string) => `/projects/${id}/functions`,
  GET: (id: string, name: string) => `/projects/${id}/functions/${name}`,
  UPDATE: (id: string, name: string) => `/projects/${id}/functions/${name}`,
  DELETE: (id: string, name: string) => `/projects/${id}/functions/${name}`,
  INVOKE: (id: string, name: string) => `/projects/${id}/functions/${name}/invoke`,
  LOGS: (id: string, name: string) => `/projects/${id}/functions/${name}/logs`,
} as const;

// Storage (project slug-based, for API key auth)
export const STORAGE = {
  LIST_BUCKETS: (slug: string) => `/projects/${slug}/storage`,
  CREATE_BUCKET: (slug: string, bucket: string) => `/projects/${slug}/storage/${bucket}/create`,
  DELETE_BUCKET: (slug: string, bucket: string) => `/projects/${slug}/storage/${bucket}/delete`,
  LIST_FILES: (slug: string, bucket: string) => `/projects/${slug}/storage/${bucket}/files`,
  UPLOAD: (slug: string, bucket: string) => `/projects/${slug}/storage/${bucket}/upload`,
  UPLOAD_MULTIPLE: (slug: string, bucket: string) => `/projects/${slug}/storage/${bucket}/upload-multiple`,
  DOWNLOAD: (slug: string, bucket: string, path: string) => `/projects/${slug}/storage/${bucket}/download/${path}`,
  DELETE_FILES: (slug: string, bucket: string) => `/projects/${slug}/storage/${bucket}`,
  PUBLIC_URL: (slug: string, bucket: string, path: string) => `/projects/${slug}/storage/${bucket}/public-url/${path}`,
  BUCKET_SIZE: (slug: string, bucket: string) => `/projects/${slug}/storage/${bucket}/size`,
} as const;

// Logging
export const LOGS = {
  ALL: (id: string) => `/projects/${id}/logs`,
  STATS: (id: string) => `/projects/${id}/logs/stats`,
  DATABASE: (id: string) => `/projects/${id}/logs/database`,
  DATABASE_SLOW: (id: string) => `/projects/${id}/logs/database/slow`,
  DATABASE_ERRORS: (id: string) => `/projects/${id}/logs/database/errors`,
  AUTH: (id: string) => `/projects/${id}/logs/auth`,
  AUTH_FAILURES: (id: string) => `/projects/${id}/logs/auth/failures`,
  AUTH_SECURITY: (id: string) => `/projects/${id}/logs/auth/security`,
  EDGE_FUNCTIONS: (id: string) => `/projects/${id}/logs/edge-functions`,
  FUNCTION_CONSOLE: (id: string, name: string) => `/projects/${id}/logs/edge-functions/${name}/console`,
  FUNCTION_ERRORS: (id: string, name: string) => `/projects/${id}/logs/edge-functions/${name}/errors`,
  EXPORT: (id: string) => `/projects/${id}/logs/export`,
} as const;

// Dashboard
export const DASHBOARD = {
  STATS: '/dashboard/stats',
  ACTIVITY: '/dashboard/activity',
} as const;
