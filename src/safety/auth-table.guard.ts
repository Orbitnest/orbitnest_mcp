const AUTH_TABLES = [
  'auth_users',
  'auth_sessions',
  'auth_refresh_tokens',
  'auth_email_verification_codes',
  'auth_audit_log',
  'auth_identities',
  'auth_config',
];

const SYSTEM_SCHEMAS = ['pg_catalog', 'information_schema', 'pg_toast'];

export function isAuthTable(tableName: string): boolean {
  const normalized = tableName.toLowerCase().replace(/"/g, '');
  return AUTH_TABLES.includes(normalized) || normalized.startsWith('auth_');
}

export function isSystemSchema(schemaName: string): boolean {
  return SYSTEM_SCHEMAS.includes(schemaName.toLowerCase());
}

export function getAuthTables(): string[] {
  return [...AUTH_TABLES];
}

export function extractTableNames(sql: string): string[] {
  const tables: string[] = [];
  const normalized = sql.replace(/\s+/g, ' ').trim();

  // FROM / JOIN clauses
  const fromPattern = /(?:FROM|JOIN)\s+(?:"?(\w+)"?\.)?(?:"?(\w+)"?)/gi;
  let match: RegExpExecArray | null;
  while ((match = fromPattern.exec(normalized)) !== null) {
    tables.push(match[2].toLowerCase());
  }

  // INTO clause
  const intoPattern = /INTO\s+(?:"?(\w+)"?\.)?(?:"?(\w+)"?)/gi;
  while ((match = intoPattern.exec(normalized)) !== null) {
    tables.push(match[2].toLowerCase());
  }

  // UPDATE clause
  const updatePattern = /UPDATE\s+(?:"?(\w+)"?\.)?(?:"?(\w+)"?)/gi;
  while ((match = updatePattern.exec(normalized)) !== null) {
    tables.push(match[2].toLowerCase());
  }

  // DROP / TRUNCATE / ALTER TABLE
  const ddlPattern = /(?:DROP|TRUNCATE|ALTER)\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:"?(\w+)"?\.)?(?:"?(\w+)"?)/gi;
  while ((match = ddlPattern.exec(normalized)) !== null) {
    tables.push(match[2].toLowerCase());
  }

  // CREATE TABLE
  const createPattern = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"?(\w+)"?\.)?(?:"?(\w+)"?)/gi;
  while ((match = createPattern.exec(normalized)) !== null) {
    tables.push(match[2].toLowerCase());
  }

  return [...new Set(tables)];
}

export function findAuthTablesInQuery(sql: string): string[] {
  const tables = extractTableNames(sql);
  return tables.filter(isAuthTable);
}
