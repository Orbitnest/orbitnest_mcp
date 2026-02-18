import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { AppConfig } from './types/config.types.js';
import { OrbitNestClient } from './sdk/orbitnest.client.js';
import { SessionService } from './auth/session.service.js';
import { SchemaService } from './context/schema.service.js';
import { WorkspaceService } from './context/workspace.service.js';
import { ProjectService } from './context/project.service.js';
import { registerAllTools, type ToolContext } from './tools/index.js';
import { logger } from './utils/logger.js';

export async function createServer(config: AppConfig): Promise<McpServer> {
  // Initialize API client
  const apiClient = new OrbitNestClient({
    apiUrl: config.apiUrl,
    accessToken: '',
  });

  // Initialize services
  const sessionService = new SessionService(config, apiClient);
  const schemaService = new SchemaService(apiClient, config.schemaCacheTtl);
  const workspaceService = new WorkspaceService();
  const projectService = new ProjectService(apiClient);

  // Load stored credentials
  await sessionService.initialize();

  // Detect workspace configuration
  const wsConfig = await workspaceService.detectWorkspace();
  if (wsConfig) {
    const session = sessionService.getSession();
    if (!session.currentProjectId) {
      session.currentProjectId = wsConfig.projectId;
      session.currentProjectSlug = wsConfig.projectSlug;
      logger.info('Project context loaded from workspace', { projectId: wsConfig.projectId });
    }
  }

  // Create MCP server
  const server = new McpServer({
    name: config.serverName,
    version: config.serverVersion,
  });

  // Build tool context
  const toolContext: ToolContext = {
    session: sessionService,
    apiClient,
    schemaService,
    workspaceService,
    projectService,
    config,
  };

  // Register all tools
  registerAllTools(server, toolContext);

  logger.info('MCP server initialized', {
    tools: 'all registered',
    authenticated: String(sessionService.isAuthenticated()),
    activeProject: sessionService.getSession().currentProjectId ?? 'none',
  });

  return server;
}

export async function startStdioServer(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('OrbitNest MCP server running on stdio');
}
