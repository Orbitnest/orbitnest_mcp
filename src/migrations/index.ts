export * from './types.js';
export { MigrationScanner } from './migrationScanner.js';
export { MigrationRegistry, REGISTRY_TABLE } from './migrationRegistry.js';
export { MigrationExecutor } from './migrationExecutor.js';
export { MigrationRunner } from './migrationRunner.js';
export type { MigrationRunnerDeps } from './migrationRunner.js';

import { MigrationScanner } from './migrationScanner.js';
import { MigrationRegistry } from './migrationRegistry.js';
import { MigrationExecutor } from './migrationExecutor.js';
import { MigrationRunner } from './migrationRunner.js';
import type { MigrationSqlClient } from './types.js';

/** Wire a runner from a SQL client + migrations directory. */
export function createMigrationRunner(sql: MigrationSqlClient, migrationsDir = 'migrations'): MigrationRunner {
  return new MigrationRunner({
    scanner: new MigrationScanner(migrationsDir),
    registry: new MigrationRegistry(sql),
    executor: new MigrationExecutor(sql),
  });
}
