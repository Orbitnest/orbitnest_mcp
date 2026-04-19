import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ToolContext } from './index.js';
import { formatErrorResponse } from '../utils/errors.js';
import { requireProjectId } from '../utils/validators.js';

const TIMEOUT_MAP: Record<string, number> = {
  '10s': 10_000,
  '30s': 30_000,
  '60s': 60_000,
  '120s': 120_000,
};

function parseTimeoutToMs(label: string): number {
  return TIMEOUT_MAP[label] ?? 30_000;
}

export function registerFunctionTools(server: McpServer, ctx: ToolContext): void {

  // ─── Create Function ───
  server.registerTool('orbitnest_create_function', {
    description: 'Create a new edge function with JavaScript/TypeScript source code. Timeout controls how long the function can run before being terminated.',
    inputSchema: {
      projectId: z.string().optional(),
      name: z.string().min(1),
      description: z.string().optional(),
      sourceCode: z.string().min(1),
      timeout: z.enum(['10s', '30s', '60s', '120s']).optional().describe('Max execution time. Allowed: 10s, 30s (default), 60s, 120s.'),
    },
  }, async ({ projectId, name, description, sourceCode, timeout }) => {
    try {
      await ctx.session.ensureAuthenticated();
      const id = requireProjectId(projectId, ctx.session.getSession().currentProjectId);
      const executionConfig = timeout ? { timeout: parseTimeoutToMs(timeout) } : undefined;
      const result = await ctx.apiClient.createFunction(id, { name, description, sourceCode, executionConfig });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });

  // ─── List Functions ───
  server.registerTool('orbitnest_list_functions', {
    description: 'List all edge functions for a project.',
    inputSchema: { projectId: z.string().optional() },
  }, async ({ projectId }) => {
    try {
      await ctx.session.ensureAuthenticated();
      const id = requireProjectId(projectId, ctx.session.getSession().currentProjectId);
      const result = await ctx.apiClient.listFunctions(id);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });

  // ─── Get Function ───
  server.registerTool('orbitnest_get_function', {
    description: 'Get details of a specific edge function including its source code.',
    inputSchema: { projectId: z.string().optional(), functionName: z.string() },
  }, async ({ projectId, functionName }) => {
    try {
      await ctx.session.ensureAuthenticated();
      const id = requireProjectId(projectId, ctx.session.getSession().currentProjectId);
      const result = await ctx.apiClient.getFunction(id, functionName);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });

  // ─── Update Function ───
  server.registerTool('orbitnest_update_function', {
    description: 'Update an edge function\'s source code, description, or timeout.',
    inputSchema: {
      projectId: z.string().optional(),
      functionName: z.string(),
      sourceCode: z.string().optional(),
      description: z.string().optional(),
      timeout: z.enum(['10s', '30s', '60s', '120s']).optional().describe('Max execution time. Allowed: 10s, 30s, 60s, 120s.'),
    },
  }, async ({ projectId, functionName, sourceCode, description, timeout }) => {
    try {
      await ctx.session.ensureAuthenticated();
      const id = requireProjectId(projectId, ctx.session.getSession().currentProjectId);
      const executionConfig = timeout ? { timeout: parseTimeoutToMs(timeout) } : undefined;
      const result = await ctx.apiClient.updateFunction(id, functionName, { sourceCode, description, executionConfig });

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });

  // ─── Delete Function ───
  server.registerTool('orbitnest_delete_function', {
    description: 'Delete an edge function. Requires confirmation.',
    inputSchema: {
      projectId: z.string().optional(),
      functionName: z.string(),
      confirmDeletion: z.boolean(),
    },
  }, async ({ projectId, functionName, confirmDeletion }) => {
    try {
      await ctx.session.ensureAuthenticated();
      const id = requireProjectId(projectId, ctx.session.getSession().currentProjectId);
      if (!confirmDeletion) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({
            error: 'Function deletion requires confirmDeletion=true.',
          }, null, 2) }],
        };
      }
      const result = await ctx.apiClient.deleteFunction(id, functionName);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ success: true, data: result }, null, 2) }],
      };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });

  // ─── Get Function Logs ───
  server.registerTool('orbitnest_get_function_logs', {
    description: 'Retrieve execution logs for a specific edge function.',
    inputSchema: {
      projectId: z.string().optional(),
      functionName: z.string(),
      limit: z.number().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
    },
  }, async ({ projectId, functionName, limit, startTime, endTime }) => {
    try {
      await ctx.session.ensureAuthenticated();
      const id = requireProjectId(projectId, ctx.session.getSession().currentProjectId);
      const result = await ctx.apiClient.getFunctionLogs(id, functionName, { limit, startTime, endTime });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });

  // ─── Manage Environment Variables ───
  server.registerTool('orbitnest_get_env_variables', {
    description: 'Get all environment variables for a project\'s edge functions.',
    inputSchema: { projectId: z.string().optional() },
  }, async ({ projectId }) => {
    try {
      await ctx.session.ensureAuthenticated();
      const id = requireProjectId(projectId, ctx.session.getSession().currentProjectId);
      const result = await ctx.apiClient.getEnvVariables(id);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });

  server.registerTool('orbitnest_create_env_variable', {
    description: 'Create a new environment variable for a project.',
    inputSchema: {
      projectId: z.string().optional(),
      key: z.string().min(1),
      value: z.string(),
      encrypted: z.boolean().optional(),
    },
  }, async ({ projectId, key, value, encrypted }) => {
    try {
      await ctx.session.ensureAuthenticated();
      const id = requireProjectId(projectId, ctx.session.getSession().currentProjectId);
      const result = await ctx.apiClient.createEnvVariable(id, { key, value, encrypted });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });

  server.registerTool('orbitnest_update_env_variable', {
    description: 'Update an existing environment variable.',
    inputSchema: {
      projectId: z.string().optional(),
      variableId: z.string(),
      key: z.string().optional(),
      value: z.string().optional(),
    },
  }, async ({ projectId, variableId, key, value }) => {
    try {
      await ctx.session.ensureAuthenticated();
      const id = requireProjectId(projectId, ctx.session.getSession().currentProjectId);
      const result = await ctx.apiClient.updateEnvVariable(id, variableId, { key, value });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });

  server.registerTool('orbitnest_delete_env_variable', {
    description: 'Delete an environment variable.',
    inputSchema: { projectId: z.string().optional(), variableId: z.string() },
  }, async ({ projectId, variableId }) => {
    try {
      await ctx.session.ensureAuthenticated();
      const id = requireProjectId(projectId, ctx.session.getSession().currentProjectId);
      const result = await ctx.apiClient.deleteEnvVariable(id, variableId);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ success: true, data: result }, null, 2) }],
      };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });
}
