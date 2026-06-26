import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { AppConfig } from './types/config.types.js';
import { OrbitNestClient } from './sdk/orbitnest.client.js';
import { SessionService } from './auth/session.service.js';
import { SchemaService } from './context/schema.service.js';
import { WorkspaceService } from './context/workspace.service.js';
import { ProjectService } from './context/project.service.js';
import { SessionTracker } from './context/session-tracker.js';
import { registerAllTools, type ToolContext } from './tools/index.js';
import { logger } from './utils/logger.js';

export async function createServer(config: AppConfig): Promise<{ server: McpServer; tracker: SessionTracker; apiClient: OrbitNestClient }> {
  const apiClient = new OrbitNestClient({ apiUrl: config.apiUrl, accessToken: '' });

  const sessionService = new SessionService(config, apiClient);
  const schemaService = new SchemaService(apiClient, config.schemaCacheTtl);
  const workspaceService = new WorkspaceService();
  const projectService = new ProjectService(apiClient);
  const tracker = new SessionTracker();

  await sessionService.initialize();

  // Detect workspace config and set active project.
  const wsConfig = await workspaceService.detectWorkspace();
  if (wsConfig) {
    const session = sessionService.getSession();
    if (!session.currentProjectId) {
      session.currentProjectId = wsConfig.projectId;
      session.currentProjectSlug = wsConfig.projectSlug;
      logger.info('Project context loaded from workspace', { projectId: wsConfig.projectId });
    }
  }

  // ── Register the active project with the tracker ────────────────────────
  // The workspace marker (.orbitnest/config.json) tells us WHICH project this
  // is; that's the auto-hook. We deliberately do NOT pull the project context
  // here. Embedding a live snapshot into the server instructions inflates the
  // system prompt on every single request — a large stored digest then blows
  // past the model's context limit. Context is pulled on demand instead, once,
  // via orbitnest_get_project_context.
  const activeProjectId = sessionService.getSession().currentProjectId;
  if (activeProjectId) tracker.setProject(activeProjectId);

  // ── SESSION_INSTRUCTIONS ─────────────────────────────────────────────────
  // Surfaced by MCP clients as the server's system instructions — they ride
  // along on every request, so keep them SMALL. Pointers to tools, no data.
  const SESSION_INSTRUCTIONS = [
    'Persistent memory for OrbitNest projects (Project Intelligence). Pull context on demand; never assume it is already loaded.',
    '',
    'SESSION START: if no project is set, call orbitnest_list_projects then orbitnest_set_active_project.',
    'Then call orbitnest_get_project_context ONCE to load this project\'s memory (profile, open tasks, decisions, recent events). Do not call it again unless you need a refresh.',
    '',
    'DURING THE SESSION, write as things happen (not batched at the end):',
    '  orbitnest_add_decision — an architectural/product decision',
    '  orbitnest_add_task     — a follow-up / TODO',
    '  orbitnest_add_event    — a deploy / bug / milestone',
    '  orbitnest_search_memory — recall anything not in the loaded context',
    '',
    'SESSION END: call orbitnest_sync_memory once with a digest (what was done, decisions, blockers, what\'s next) plus any unsaved decisions/tasks/events. Keep the digest concise — a summary, not a transcript or file dumps. Memory is only persisted when you call a tool.',
  ].join('\n');

  // ── Create MCP server ────────────────────────────────────────────────────
  const server = new McpServer(
    { name: config.serverName, version: config.serverVersion },
    { instructions: SESSION_INSTRUCTIONS },
  );

  // ── Register project://context resource ─────────────────────────────────
  // MCP clients that support resources can fetch this to get live context.
  // Many clients auto-read resources and present them to the AI.
  try {
    server.registerResource(
      'project-context',
      'project://context',
      {
        title: 'Project Intelligence Context',
        description:
          'Live OrbitNest project context: profile, tech stack, open tasks, active decisions, feature roadmap, and recent events. ' +
          'Read this at session start to orient yourself. Updated in real time as the project evolves.',
        mimeType: 'application/json',
      },
      async () => {
        await sessionService.ensureAuthenticated();
        const pid = sessionService.getSession().currentProjectId;
        if (!pid) {
          return {
            contents: [{
              uri: 'project://context',
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'No active project. Call orbitnest_set_active_project first.' }),
            }],
          };
        }
        const ctx = await apiClient.getProjectContext(pid, { events: 20 });
        return {
          contents: [{
            uri: 'project://context',
            mimeType: 'application/json',
            text: JSON.stringify(ctx, null, 2),
          }],
        };
      },
    );
    logger.info('Registered MCP resource: project://context');
  } catch (err) {
    logger.warn('Could not register project://context resource', { err: String(err) });
  }

  // ── Build tool context and register tools ────────────────────────────────
  const toolContext: ToolContext = {
    session: sessionService,
    apiClient,
    schemaService,
    workspaceService,
    projectService,
    config,
    tracker,
  };

  registerAllTools(server, toolContext);

  logger.info('MCP server initialized', {
    tools: 'all registered',
    authenticated: String(sessionService.isAuthenticated()),
    activeProject: sessionService.getSession().currentProjectId ?? 'none',
  });

  return { server, tracker, apiClient };
}

export async function startStdioServer(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('OrbitNest MCP server running on stdio');
}
