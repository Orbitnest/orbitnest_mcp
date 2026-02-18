import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ToolContext } from './index.js';
import { formatErrorResponse } from '../utils/errors.js';

export function registerAdminTools(server: McpServer, ctx: ToolContext): void {

  // ─── List Admins ───
  server.registerTool('orbitnest_list_admins', {
    description: 'List all admin users in the OrbitNest platform.',
    inputSchema: {},
  }, async () => {
    try {
      await ctx.session.ensureAuthenticated();
      const result = await ctx.apiClient.listAdmins();
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });

  // ─── Get Admin ───
  server.registerTool('orbitnest_get_admin', {
    description: 'Get details of a specific admin user.',
    inputSchema: { adminId: z.string() },
  }, async ({ adminId }) => {
    try {
      await ctx.session.ensureAuthenticated();
      const result = await ctx.apiClient.getAdmin(adminId);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });

  // ─── Create Admin ───
  server.registerTool('orbitnest_create_admin', {
    description: 'Create a new admin user.',
    inputSchema: {
      email: z.string().email(),
      password: z.string().min(8),
      isActive: z.boolean().optional(),
    },
  }, async ({ email, password, isActive }) => {
    try {
      await ctx.session.ensureAuthenticated();
      const result = await ctx.apiClient.createAdmin({ email, password, isActive });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });

  // ─── Update Admin ───
  server.registerTool('orbitnest_update_admin', {
    description: 'Update an admin user\'s details.',
    inputSchema: {
      adminId: z.string(),
      email: z.string().email().optional(),
      isActive: z.boolean().optional(),
    },
  }, async ({ adminId, email, isActive }) => {
    try {
      await ctx.session.ensureAuthenticated();
      const result = await ctx.apiClient.updateAdmin(adminId, { email, isActive });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });

  // ─── Delete Admin ───
  server.registerTool('orbitnest_delete_admin', {
    description: 'Delete an admin user. Requires confirmation.',
    inputSchema: { adminId: z.string(), confirmDeletion: z.boolean() },
  }, async ({ adminId, confirmDeletion }) => {
    try {
      await ctx.session.ensureAuthenticated();
      if (!confirmDeletion) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({
            error: 'Admin deletion requires confirmDeletion=true.',
          }, null, 2) }],
        };
      }
      const result = await ctx.apiClient.deleteAdmin(adminId);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ success: true, data: result }, null, 2) }],
      };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });
}
