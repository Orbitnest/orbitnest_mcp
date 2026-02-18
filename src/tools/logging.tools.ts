import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ToolContext } from './index.js';
import { formatErrorResponse } from '../utils/errors.js';
import { requireProjectId } from '../utils/validators.js';

export function registerLoggingTools(server: McpServer, ctx: ToolContext): void {

  // ─── Query Logs ───
  server.registerTool('orbitnest_query_logs', {
    description: 'Query project logs with filtering by type, level, time range, and text search.',
    inputSchema: {
      projectId: z.string().optional(),
      logType: z.enum(['all', 'database', 'auth', 'edge-functions']).optional(),
      level: z.enum(['info', 'warn', 'error']).optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    },
  }, async ({ projectId, logType, level, startTime, endTime, search, limit, offset }) => {
    try {
      await ctx.session.ensureAuthenticated();
      const id = requireProjectId(projectId, ctx.session.getSession().currentProjectId);

      let result;
      switch (logType) {
        case 'database':
          result = await ctx.apiClient.getDatabaseLogs(id, { limit });
          break;
        case 'auth':
          result = await ctx.apiClient.getAuthLogs(id, { limit });
          break;
        case 'edge-functions':
          result = await ctx.apiClient.getEdgeFunctionLogs(id, { limit });
          break;
        default:
          result = await ctx.apiClient.getLogs(id, { level, startTime, endTime, search, limit, offset });
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });

  // ─── Get Slow Queries ───
  server.registerTool('orbitnest_get_slow_queries', {
    description: 'Get slow database queries (queries taking >1000ms) for performance monitoring.',
    inputSchema: { projectId: z.string().optional(), limit: z.number().optional() },
  }, async ({ projectId, limit }) => {
    try {
      await ctx.session.ensureAuthenticated();
      const id = requireProjectId(projectId, ctx.session.getSession().currentProjectId);
      const result = await ctx.apiClient.getSlowQueryLogs(id, { limit });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });

  // ─── Export Logs ───
  server.registerTool('orbitnest_export_logs', {
    description: 'Export project logs in JSON or CSV format.',
    inputSchema: {
      projectId: z.string().optional(),
      format: z.enum(['json', 'csv']).optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
    },
  }, async ({ projectId, format, startTime, endTime }) => {
    try {
      await ctx.session.ensureAuthenticated();
      const id = requireProjectId(projectId, ctx.session.getSession().currentProjectId);
      const result = await ctx.apiClient.exportLogs(id, { format, startTime, endTime });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });

  // ─── Get Log Stats ───
  server.registerTool('orbitnest_get_log_stats', {
    description: 'Get log statistics and aggregations for a project.',
    inputSchema: { projectId: z.string().optional() },
  }, async ({ projectId }) => {
    try {
      await ctx.session.ensureAuthenticated();
      const id = requireProjectId(projectId, ctx.session.getSession().currentProjectId);
      const result = await ctx.apiClient.getLogStats(id);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });
}
