import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ToolContext } from './index.js';
import { formatErrorResponse } from '../utils/errors.js';
import { requireProjectId } from '../utils/validators.js';

export function registerProjectIntelligenceTools(server: McpServer, ctx: ToolContext): void {

  // ─── Get Project Context ───
  server.registerTool('orbitnest_get_project_context', {
    description:
      'Load the full project intelligence context: summary, stack, conventions, digest, open tasks, active decisions, and feature roadmap. ' +
      'Call this at the start of every work session to orient yourself to the project state.',
    inputSchema: {
      projectId: z.string().uuid().optional().describe('Project ID (uses active project if omitted)'),
      includeSchema: z.boolean().optional().describe('Also return the DB schema alongside the context'),
      eventLimit: z.number().int().min(1).max(50).optional().describe('How many recent events to include (default 20)'),
    },
  }, async ({ projectId, includeSchema, eventLimit }) => {
    try {
      await ctx.session.ensureAuthenticated();
      const pid = requireProjectId(projectId, ctx.session.getSession().currentProjectId);
      const result = await ctx.apiClient.getProjectContext(pid, {
        includeSchema, events: eventLimit,
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });

  // ─── Get Recent Changes ───
  server.registerTool('orbitnest_get_recent_changes', {
    description: 'Get recent project events since a given timestamp. Use to catch up on what changed since your last session.',
    inputSchema: {
      projectId: z.string().uuid().optional(),
      since: z.string().optional().describe('ISO 8601 timestamp — only return events after this point'),
      limit: z.number().int().min(1).max(100).optional(),
    },
  }, async ({ projectId, since, limit }) => {
    try {
      await ctx.session.ensureAuthenticated();
      const pid = requireProjectId(projectId, ctx.session.getSession().currentProjectId);
      const result = await ctx.apiClient.getRecentChanges(pid, { since, limit });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });

  // ─── Get Open Tasks ───
  server.registerTool('orbitnest_get_open_tasks', {
    description: 'Get open tasks (todo + in_progress) for the project, sorted by priority.',
    inputSchema: {
      projectId: z.string().uuid().optional(),
      priority: z.enum(['urgent', 'high', 'medium', 'low']).optional().describe('Filter by priority'),
    },
  }, async ({ projectId, priority }) => {
    try {
      await ctx.session.ensureAuthenticated();
      const pid = requireProjectId(projectId, ctx.session.getSession().currentProjectId);
      const result = await ctx.apiClient.getOpenTasks(pid, { priority });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });

  // ─── Add Task ───
  server.registerTool('orbitnest_add_task', {
    description: 'Add a task to the project memory. The AI agent should call this when identifying a follow-up action item during a work session.',
    inputSchema: {
      projectId: z.string().uuid().optional(),
      title: z.string().min(1).max(200),
      detail: z.string().max(2000).optional(),
      priority: z.enum(['urgent', 'high', 'medium', 'low']).optional(),
      linkedFeatureId: z.string().uuid().optional(),
    },
  }, async ({ projectId, title, detail, priority, linkedFeatureId }) => {
    try {
      await ctx.session.ensureAuthenticated();
      const pid = requireProjectId(projectId, ctx.session.getSession().currentProjectId);
      const result = await ctx.apiClient.addTask(pid, { title, detail, priority, linkedFeatureId });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });

  // ─── Complete Task ───
  server.registerTool('orbitnest_complete_task', {
    description: 'Mark a task as done. Optionally add a completion note.',
    inputSchema: {
      projectId: z.string().uuid().optional(),
      taskId: z.string().uuid(),
      note: z.string().max(500).optional(),
    },
  }, async ({ projectId, taskId, note }) => {
    try {
      await ctx.session.ensureAuthenticated();
      const pid = requireProjectId(projectId, ctx.session.getSession().currentProjectId);
      const result = await ctx.apiClient.completeTask(pid, taskId, { note });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });

  // ─── Get Decisions ───
  server.registerTool('orbitnest_get_decisions', {
    description: 'Retrieve the active architectural or product decisions for the project. Reference these before making design choices.',
    inputSchema: {
      projectId: z.string().uuid().optional(),
      status: z.enum(['active', 'superseded', 'all']).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
  }, async ({ projectId, status, limit }) => {
    try {
      await ctx.session.ensureAuthenticated();
      const pid = requireProjectId(projectId, ctx.session.getSession().currentProjectId);
      const result = await ctx.apiClient.getProjectDecisions(pid, { status, limit });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });

  // ─── Add Decision ───
  server.registerTool('orbitnest_add_decision', {
    description:
      'Record an architectural or product decision in the project memory. ' +
      'Call this whenever you make a significant technical choice (e.g. "use JWT over sessions", "adopt REST over GraphQL").',
    inputSchema: {
      projectId: z.string().uuid().optional(),
      decision: z.string().min(1).max(500).describe('The decision made, in one sentence'),
      reason: z.string().max(2000).optional().describe('Why this decision was made'),
      metadata: z.record(z.unknown()).optional(),
    },
  }, async ({ projectId, decision, reason, metadata }) => {
    try {
      await ctx.session.ensureAuthenticated();
      const pid = requireProjectId(projectId, ctx.session.getSession().currentProjectId);
      const result = await ctx.apiClient.addDecision(pid, { decision, reason, metadata: metadata as Record<string, unknown> | undefined });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });

  // ─── Add Feature ───
  server.registerTool('orbitnest_add_feature', {
    description: 'Add a feature to the project roadmap memory.',
    inputSchema: {
      projectId: z.string().uuid().optional(),
      name: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
      status: z.enum(['planned', 'in_progress', 'released', 'cancelled']).optional(),
      dependencies: z.array(z.string()).optional(),
    },
  }, async ({ projectId, name, description, status, dependencies }) => {
    try {
      await ctx.session.ensureAuthenticated();
      const pid = requireProjectId(projectId, ctx.session.getSession().currentProjectId);
      const result = await ctx.apiClient.addFeature(pid, { name, description, status, dependencies });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });

  // ─── Update Feature ───
  server.registerTool('orbitnest_update_feature', {
    description: 'Update a feature status or description (e.g. move from in_progress → released after shipping).',
    inputSchema: {
      projectId: z.string().uuid().optional(),
      featureId: z.string().uuid(),
      status: z.enum(['planned', 'in_progress', 'released', 'cancelled']).optional(),
      description: z.string().max(2000).optional(),
    },
  }, async ({ projectId, featureId, status, description }) => {
    try {
      await ctx.session.ensureAuthenticated();
      const pid = requireProjectId(projectId, ctx.session.getSession().currentProjectId);
      const result = await ctx.apiClient.updateFeature(pid, featureId, { status, description });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });

  // ─── Add Event ───
  server.registerTool('orbitnest_add_event', {
    description:
      'Record a significant project event in the timeline (deploy, bug fix, design change, external dependency update, etc.). ' +
      'This builds the project\'s historical context for future sessions.',
    inputSchema: {
      projectId: z.string().uuid().optional(),
      type: z.enum(['deploy', 'bug', 'decision', 'update', 'milestone', 'incident', 'other']),
      summary: z.string().min(1).max(500),
      metadata: z.record(z.unknown()).optional(),
    },
  }, async ({ projectId, type, summary, metadata }) => {
    try {
      await ctx.session.ensureAuthenticated();
      const pid = requireProjectId(projectId, ctx.session.getSession().currentProjectId);
      const result = await ctx.apiClient.addEvent(pid, { type, summary, metadata: metadata as Record<string, unknown> | undefined });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });

  // ─── Search Memory ───
  server.registerTool('orbitnest_search_memory', {
    description:
      'Semantic search over the project intelligence memory. ' +
      'Use when you need to recall a past decision, task, feature, or event that isn\'t surfaced in get_project_context.',
    inputSchema: {
      projectId: z.string().uuid().optional(),
      query: z.string().min(1).max(500),
      sourceType: z.enum(['decision', 'task', 'feature', 'event', 'summary']).optional(),
      limit: z.number().int().min(1).max(20).optional(),
    },
  }, async ({ projectId, query, sourceType, limit }) => {
    try {
      await ctx.session.ensureAuthenticated();
      const pid = requireProjectId(projectId, ctx.session.getSession().currentProjectId);
      const result = await ctx.apiClient.searchProjectMemory(pid, { query, sourceType, limit });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });

  // ─── Set Project Profile ───
  server.registerTool('orbitnest_set_project_profile', {
    description:
      'Update the project profile: summary, tech stack, conventions, or agent-written digest. ' +
      'Call this at the END of each work session to write a brief digest of what was accomplished and what comes next. ' +
      'This is the primary way the project memory is kept fresh for future sessions.',
    inputSchema: {
      projectId: z.string().uuid().optional(),
      summary: z.string().max(1000).optional().describe('One-paragraph project overview'),
      stack: z.array(z.string()).optional().describe('Tech stack (e.g. ["NestJS", "Next.js", "Postgres"])'),
      conventions: z.record(z.unknown()).optional().describe('Key conventions object (e.g. { "auth": "JWT", "style": "snake_case" })'),
      digest: z.string().max(3000).optional().describe('Agent-written end-of-session digest: what was done, decisions made, what comes next'),
    },
  }, async ({ projectId, summary, stack, conventions, digest }) => {
    try {
      await ctx.session.ensureAuthenticated();
      const pid = requireProjectId(projectId, ctx.session.getSession().currentProjectId);
      const result = await ctx.apiClient.setProjectProfile(pid, {
        summary, stack, conventions: conventions as Record<string, unknown> | undefined, digest,
      });
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });
}
