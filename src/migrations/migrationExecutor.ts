import { MigrationError, type MigrationFile, type MigrationSqlClient } from './types.js';

/**
 * Runs one migration's SQL atomically — the whole file is wrapped in a single
 * `BEGIN; … COMMIT;` batch, so a failure rolls the entire migration back.
 * Scripts must be transaction-safe.
 */
export class MigrationExecutor {
  constructor(private readonly sql: MigrationSqlClient) {}

  async execute(file: MigrationFile): Promise<void> {
    const body = file.content.trim();
    if (!body) return;

    const terminated = body.endsWith(';') ? body : `${body};`;
    const script = `BEGIN;\n${terminated}\nCOMMIT;`;

    const res = await this.sql.query(script);
    if (res.error) {
      throw new MigrationError(
        `Migration "${file.name}" failed and was rolled back: ${res.error.message}`,
      );
    }
  }
}
