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

  // ── Try to pre-load the project context at server start ─────────────────
  // This embeds a live snapshot directly into SESSION_INSTRUCTIONS so the AI
  // has it without needing to call any tool first. Fails silently if auth is
  // stale or no project is active yet.
  let contextSnapshot = '';
  const activeProjectId = sessionService.getSession().currentProjectId;
  if (sessionService.isAuthenticated() && activeProjectId) {
    tracker.setProject(activeProjectId);
    try {
      const ctx = await apiClient.getProjectContext(activeProjectId, { events: 15 });
      contextSnapshot = [
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        `PROJECT CONTEXT — auto-loaded at server start (${new Date().toISOString()})`,
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        JSON.stringify(ctx, null, 2),
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        'You already have this context. Do NOT call orbitnest_get_project_context again unless you need a refresh.',
      ].join('\n');
      logger.info('Project context pre-loaded into session instructions', { projectId: activeProjectId });
    } catch (err) {
      contextSnapshot = '\n[Context auto-load failed — call orbitnest_get_project_context to load manually.]';
      logger.warn('Could not pre-load project context', { err: String(err) });
    }
  }

  // ── SESSION_INSTRUCTIONS ─────────────────────────────────────────────────
  // These are surfaced by MCP clients as the server's system instructions.
  // Strong, imperative language — not suggestions.
  const SESSION_INSTRUCTIONS = [
    'You are an AI assistant with PERSISTENT MEMORY for OrbitNest projects via the Project Intelligence system.',
    '',
    '╔══════════════════════════════════════════════════════════════╗',
    '║              SESSION LIFECYCLE — REQUIRED STEPS             ║',
    '╚══════════════════════════════════════════════════════════════╝',
    '',
    '─── SESSION START (do this automatically, without waiting for the user) ───',
    '1. If no project is set: call orbitnest_list_projects → orbitnest_set_active_project.',
    '2. The current project context may already be embedded below (check for PROJECT CONTEXT section).',
    '   If it is: you have what you need. If not: call orbitnest_get_project_context NOW.',
    '3. Read open tasks, the digest, and active decisions before doing anything else.',
    '',
    '─── DURING THE SESSION (call these as things happen, not at the end) ───',
    '• Made a significant technical/product decision?',
    '  → Call orbitnest_add_decision immediately, not at the end.',
    '• Identified a follow-up item or TODO?',
    '  → Call orbitnest_add_task immediately.',
    '• Completed a deploy, found a bug, hit a milestone?',
    '  → Call orbitnest_add_event immediately.',
    '• Need to recall something not in the snapshot?',
    '  → Call orbitnest_search_memory (semantic search over all project memory).',
    '',
    '─── SESSION END (REQUIRED — do this before the conversation ends) ───',
    '• Call orbitnest_sync_memory with:',
    '  - digest: what was done, decisions made, blockers, what comes next',
    '  - Any decisions/tasks/events you haven\'t written yet',
    '  This is a SINGLE CALL that saves everything. Do not skip it.',
    '  If you\'re unsure whether the session is ending, write the digest anyway — it can be updated.',
    '',
    '╔══════════════════════════════════════════════════════════════╗',
    '║                    MEMORY TOOL QUICK-REF                    ║',
    '╚══════════════════════════════════════════════════════════════╝',
    '  orbitnest_get_project_context  → load / refresh full project memory',
    '  orbitnest_sync_memory          → ONE CALL: save digest + decisions + tasks + events',
    '  orbitnest_add_decision         → record an architectural/product decision',
    '  orbitnest_add_task             → record a follow-up task',
    '  orbitnest_add_event            → record a deploy / bug / milestone',
    '  orbitnest_search_memory        → semantic search over all stored memory',
    '  orbitnest_set_project_profile  → update summary / stack / conventions',
    '',
    '⚠  Memory is ONLY written when you call a tool. It does NOT save automatically.',
    '⚠  The session-end sync is the only guarantee that your work survives the next session.',
    contextSnapshot,
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
    contextPreloaded: Boolean(activeProjectId && !contextSnapshot.includes('failed')),
  });

  return { server, tracker, apiClient };
}

export async function startStdioServer(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('OrbitNest MCP server running on stdio');
}
