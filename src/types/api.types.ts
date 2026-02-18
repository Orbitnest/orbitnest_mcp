// Authentication
export interface SigninRequest {
  email: string;
  password: string;
}

export interface SigninResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
  };
}

export interface SignupRequest {
  email: string;
  password: string;
  code: string;
}

export interface RefreshResponse {
  access_token: string;
  expires_in: number;
}

// Projects
export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface ProjectResponse {
  id: string;
  name: string;
  slug: string;
  db_name: string;
  project_url: string;
  anon_key: string;
  service_role_key: string;
  created_at: string;
}

export interface UpdateProjectRequest {
  name?: string;
  settings?: Record<string, unknown>;
}

// Database
export interface ExecuteSqlRequest {
  sql: string;
}

export interface ExecuteSqlResponse {
  success: boolean;
  data: unknown[];
  rowCount: number;
  executionTime: number;
  query: string;
}

export interface TableDataResponse {
  data: Record<string, unknown>[];
  total: number;
  limit: number;
  offset: number;
}

// RLS
export interface CreatePolicyRequest {
  policyName: string;
  command: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
  using: string;
  withCheck?: string;
  roles?: string[];
}

// Edge Functions
export interface CreateFunctionRequest {
  name: string;
  description?: string;
  sourceCode: string;
}

export interface UpdateFunctionRequest {
  sourceCode?: string;
  description?: string;
}

export interface FunctionResponse {
  name: string;
  description: string;
  sourceCode: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// Storage
export interface BucketResponse {
  name: string;
  public: boolean;
  createdAt: string;
  size?: number;
}

export interface FileResponse {
  name: string;
  size: number;
  contentType: string;
  createdAt: string;
  updatedAt: string;
}

// Admin
export interface CreateAdminRequest {
  email: string;
  password: string;
  isActive?: boolean;
}

export interface AdminResponse {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

// SMTP
export interface SmtpSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  fromEmail: string;
  fromName?: string;
  secure?: boolean;
}

// Dashboard
export interface DashboardStats {
  totalProjects: number;
  totalUsers: number;
  totalFunctions: number;
  totalStorage: number;
  recentActivity: Array<{
    type: string;
    message: string;
    timestamp: string;
  }>;
}

// Logging
export interface LogEntry {
  id: string;
  level: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface LogStats {
  total: number;
  byLevel: Record<string, number>;
  byType: Record<string, number>;
}

// Environment Variables
export interface EnvVariable {
  id: string;
  key: string;
  value: string;
  encrypted: boolean;
  createdAt: string;
}
