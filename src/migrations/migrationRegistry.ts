import {
  MigrationError,
  type MigrationFile,
  type MigrationRecord,
  type MigrationSqlClient,
  type MigrationStatus,
} from './types.js';

export const REGISTRY_TABLE = 'migrations';

const CREATE_REGISTRY_SQL = `
CREATE TABLE IF NOT EXISTS ${REGISTRY_TABLE} (
  migration_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  checksum TEXT NOT NULL,
  executed_at TIMESTAMP DEFAULT NOW(),
  status TEXT NOT NULL
);`;

/** Owns the `migrations` registry table. */
export class MigrationRegistry {
  constructor(private readonly sql: MigrationSqlClient) {}

  async ensure(): Promise<void> {
    const res = await this.sql.query(CREATE_REGISTRY_SQL);
    if (res.error) {
      throw new MigrationError(`Failed to initialise migrations registry: ${res.error.message}`);
    }
  }

  async all(): Promise<Map<string, MigrationRecord>> {
    const res = await this.sql.query<MigrationRecord>(
      `SELECT migration_id, name, checksum, executed_at, status
         FROM ${REGISTRY_TABLE}
         ORDER BY migration_id`,
    );
    if (res.error) {
      throw new MigrationError(`Failed to read migrations registry: ${res.error.message}`);
    }
    const map = new Map<string, MigrationRecord>();
    for (const row of res.data?.rows ?? []) map.set(row.migration_id, row);
    return map;
  }

  async get(migrationId: string): Promise<MigrationRecord | null> {
    const res = await this.sql.query<MigrationRecord>(
      `SELECT migration_id, name, checksum, executed_at, status
         FROM ${REGISTRY_TABLE}
        WHERE migration_id = $1`,
      [migrationId],
    );
    if (res.error) {
      throw new MigrationError(`Failed to read migration "${migrationId}": ${res.error.message}`);
    }
    return res.data?.rows?.[0] ?? null;
  }

  async record(file: MigrationFile, status: MigrationStatus): Promise<void> {
    const res = await this.sql.query(
      `INSERT INTO ${REGISTRY_TABLE} (migration_id, name, checksum, status, executed_at)
            VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (migration_id) DO UPDATE
            SET name = EXCLUDED.name,
                checksum = EXCLUDED.checksum,
                status = EXCLUDED.status,
                executed_at = NOW()`,
      [file.migrationId, file.name, file.checksum, status],
    );
    if (res.error) {
      throw new MigrationError(
        `Failed to record migration "${file.migrationId}" (${status}): ${res.error.message}`,
      );
    }
  }
}
