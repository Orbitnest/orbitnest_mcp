import { SafetyError } from '../utils/errors.js';
import { findAuthTablesInQuery, extractTableNames } from './auth-table.guard.js';

export interface SqlAnalysis {
  isDestructive: boolean;
  touchesAuthTables: boolean;
  authTables: string[];
  operations: string[];
  tables: string[];
  requiresConfirmation: boolean;
  isReadOnly: boolean;
  hasInjectionPatterns: boolean;
}

const DESTRUCTIVE_KEYWORDS = ['DROP', 'TRUNCATE', 'DELETE', 'ALTER'];
const WRITE_KEYWORDS = ['INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'TRUNCATE', 'ALTER', 'GRANT', 'REVOKE'];

const INJECTION_PATTERNS = [
  /;\s*DROP\s/i,
  /;\s*DELETE\s/i,
  /;\s*TRUNCATE\s/i,
  /;\s*ALTER\s/i,
  /;\s*UPDATE\s.*\sSET\s/i,
  /;\s*INSERT\s/i,
  /UNION\s+(ALL\s+)?SELECT/i,
  /--\s*$/m,
  /\/\*[\s\S]*?\*\//,
];

function detectOperations(sql: string): string[] {
  const ops: string[] = [];
  const normalized = sql.toUpperCase();
  const keywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'TRUNCATE', 'ALTER', 'GRANT', 'REVOKE'];
  for (const kw of keywords) {
    if (new RegExp(`\\b${kw}\\b`).test(normalized)) {
      ops.push(kw);
    }
  }
  return ops;
}

function hasDeleteWithoutWhere(sql: string): boolean {
  const normalized = sql.replace(/\s+/g, ' ').trim().toUpperCase();
  if (!normalized.includes('DELETE')) return false;
  // Check for DELETE FROM ... without WHERE
  const deletePattern = /DELETE\s+FROM\s+\S+(?:\s+(?!WHERE\b)\S+)*\s*;?\s*$/i;
  return deletePattern.test(sql.trim());
}

export function analyzeSql(sql: string): SqlAnalysis {
  const operations = detectOperations(sql);
  const tables = extractTableNames(sql);
  const authTables = findAuthTablesInQuery(sql);
  const isDestructive = operations.some(op => DESTRUCTIVE_KEYWORDS.includes(op)) || hasDeleteWithoutWhere(sql);
  const isReadOnly = operations.length === 0 || (operations.length === 1 && operations[0] === 'SELECT');
  const hasInjectionPatterns = INJECTION_PATTERNS.some(pattern => pattern.test(sql));

  return {
    isDestructive,
    touchesAuthTables: authTables.length > 0,
    authTables,
    operations,
    tables,
    requiresConfirmation: isDestructive,
    isReadOnly,
    hasInjectionPatterns,
  };
}

export function validateSql(
  sql: string,
  options: {
    confirmDestructive?: boolean;
    blockAuthMutations?: boolean;
    enableSqlGuard?: boolean;
  } = {}
): SqlAnalysis {
  const { confirmDestructive = false, blockAuthMutations = true, enableSqlGuard = true } = options;

  if (!enableSqlGuard) {
    return analyzeSql(sql);
  }

  const analysis = analyzeSql(sql);

  if (analysis.hasInjectionPatterns) {
    throw new SafetyError(
      'Potential SQL injection pattern detected. Query blocked for safety.',
      { sql: sql.substring(0, 200), patterns: 'suspicious' }
    );
  }

  if (blockAuthMutations && analysis.touchesAuthTables) {
    const readOnlyForAuthTables =
      analysis.operations.length === 0 ||
      (analysis.operations.length === 1 && analysis.operations[0] === 'SELECT');

    if (!readOnlyForAuthTables) {
      throw new SafetyError(
        'Cannot modify authentication tables directly. Use project auth APIs instead.',
        { blockedTables: analysis.authTables, operations: analysis.operations }
      );
    }
  }

  if (analysis.isDestructive && !confirmDestructive) {
    throw new SafetyError(
      'This SQL contains destructive operations. Set confirmDestructive=true to proceed.',
      {
        operations: analysis.operations,
        tables: analysis.tables,
        hint: 'Set confirmDestructive=true in your request to confirm this operation.',
      }
    );
  }

  return analysis;
}
