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
  // HIGH-02: provisioning a new platform admin is identity-mutating and can
  // create a persistent backdoor, so it requires an explicit confirmation flag
  // (matching delete_admin) rather than running silently.
  server.registerTool('orbitnest_create_admin', {
    description: 'Create a new admin user. Requires confirmCreate=true.',
    inputSchema: {
      email: z.string().email(),
      password: z.string().min(8),
      isActive: z.boolean().optional(),
      confirmCreate: z.boolean(),
    },
  }, async ({ email, password, isActive, confirmCreate }) => {
    try {
      await ctx.session.ensureAuthenticated();
      if (!confirmCreate) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({
            success: false,
            error: 'Creating a platform admin requires confirmCreate=true.',
          }, null, 2) }],
        };
      }
      const result = await ctx.apiClient.createAdmin({ email, password, isActive });
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return formatErrorResponse(error);
    }
  });

  // ─── Update Admin ───
  // HIGH-02: changing another admin's email / active state is identity-mutating
  // (can lock out a legitimate admin), so require an explicit confirmation flag.
  server.registerTool('orbitnest_update_admin', {
    description: 'Update an admin user\'s details. Requires confirmUpdate=true.',
    inputSchema: {
      adminId: z.string(),
      email: z.string().email().optional(),
      isActive: z.boolean().optional(),
      confirmUpdate: z.boolean(),
    },
  }, async ({ adminId, email, isActive, confirmUpdate }) => {
    try {
      await ctx.session.ensureAuthenticated();
      if (!confirmUpdate) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({
            success: false,
            error: 'Updating an admin requires confirmUpdate=true.',
          }, null, 2) }],
        };
      }
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
