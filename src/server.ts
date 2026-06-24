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

  const SESSION_INSTRUCTIONS = [
    'You are an AI assistant with persistent memory for OrbitNest projects.',
    '',
    'SESSION-START PROTOCOL (mandatory):',
    '1. If no project is active, call orbitnest_list_projects and orbitnest_set_active_project.',
    '2. Call orbitnest_get_project_context (or use the prompt: orbitnest_load_project) to load the full project state: profile, stack, open tasks, decisions, features, and recent events.',
    '3. Review open tasks and the latest digest so you understand where the project is.',
    '',
    'DURING THE SESSION:',
    '- When you make a significant architectural or product decision, call orbitnest_add_decision immediately.',
    '- When you identify a follow-up action item, call orbitnest_add_task.',
    '- When something notable happens (deploy, bug found, milestone reached), call orbitnest_add_event.',
    '- Use orbitnest_search_memory when you need to recall past context not in the snapshot.',
    '',
    'SESSION-END PROTOCOL (mandatory):',
    '- Call orbitnest_set_project_profile with a `digest` summarising: what was accomplished, key decisions made, blockers, and what should happen next session.',
    '',
    'Never skip the session-start context load. The project memory is only useful if it is read at the start and written at the end.',
  ].join('\n');

  // Create MCP server
  const server = new McpServer(
    { name: config.serverName, version: config.serverVersion },
    { instructions: SESSION_INSTRUCTIONS },
  );

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
