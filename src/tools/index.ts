import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SessionService } from '../auth/session.service.js';
import { OrbitNestClient } from '../sdk/orbitnest.client.js';
import { SchemaService } from '../context/schema.service.js';
import { WorkspaceService } from '../context/workspace.service.js';
import { ProjectService } from '../context/project.service.js';
import type { AppConfig } from '../types/config.types.js';

export interface ToolContext {
  session: SessionService;
  apiClient: OrbitNestClient;
  schemaService: SchemaService;
  workspaceService: WorkspaceService;
  projectService: ProjectService;
  config: AppConfig;
}

import { registerAuthTools } from './auth.tools.js';
import { registerProjectTools } from './project.tools.js';
import { registerDatabaseTools } from './database.tools.js';
import { registerRlsTools } from './rls.tools.js';
import { registerFunctionTools } from './function.tools.js';
import { registerStorageTools } from './storage.tools.js';
import { registerLoggingTools } from './logging.tools.js';
import { registerAdminTools } from './admin.tools.js';
import { registerSmtpTools } from './smtp.tools.js';
import { registerDashboardTools } from './dashboard.tools.js';
import { registerBackgroundJobsTools } from './background-jobs.tools.js';
import { registerRealtimeTools } from './realtime.tools.js';
import { registerAnalyticsTools } from './analytics.tools.js';
import { registerMigrationTools } from './migration.tools.js';

export function registerAllTools(server: McpServer, ctx: ToolContext): void {
  registerAuthTools(server, ctx);
  registerProjectTools(server, ctx);
  registerDatabaseTools(server, ctx);
  registerRlsTools(server, ctx);
  registerFunctionTools(server, ctx);
  registerBackgroundJobsTools(server, ctx);
  registerStorageTools(server, ctx);
  registerLoggingTools(server, ctx);
  registerAdminTools(server, ctx);
  registerSmtpTools(server, ctx);
  registerDashboardTools(server, ctx);
  registerRealtimeTools(server, ctx);
  registerAnalyticsTools(server, ctx);
  registerMigrationTools(server, ctx);
}
