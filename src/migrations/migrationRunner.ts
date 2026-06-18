import { MigrationScanner } from './migrationScanner.js';
import { MigrationRegistry } from './migrationRegistry.js';
import { MigrationExecutor } from './migrationExecutor.js';
import {
  MigrationError,
  type MigrationFile,
  type MigrationStatusEntry,
  type RunResult,
} from './types.js';

export interface MigrationRunnerDeps {
  scanner: MigrationScanner;
  registry: MigrationRegistry;
  executor: MigrationExecutor;
}

/**
 * Orchestrates the migration lifecycle. Safety rules enforced:
 *  - sequential, never parallel (in-process lock);
 *  - completed migrations are never re-run;
 *  - a changed-after-apply file (checksum mismatch) aborts the run;
 *  - stop on the first failure.
 */
export class MigrationRunner {
  private readonly scanner: MigrationScanner;
  private readonly registry: MigrationRegistry;
  private readonly executor: MigrationExecutor;
  private running = false;

  constructor(deps: MigrationRunnerDeps) {
    this.scanner = deps.scanner;
    this.registry = deps.registry;
    this.executor = deps.executor;
  }

  async runAll(): Promise<RunResult> {
    return this.withLock(async () => {
      await this.registry.ensure();
      const files = this.scanner.scan();
      const applied = await this.registry.all();
      const result: RunResult = { ran: [], skipped: [] };

      for (const file of files) {
        const record = applied.get(file.migrationId);
        if (record && record.status === 'success') {
          this.assertUnchanged(file, record.checksum);
          result.skipped.push(file.migrationId);
          continue;
        }
        await this.apply(file, result);
      }
      return result;
    });
  }

  async runOne(migrationId: string): Promise<RunResult> {
    return this.withLock(async () => {
      await this.registry.ensure();
      const file = this.scanner.scan().find((f) => f.migrationId === migrationId);
      if (!file) {
        throw new MigrationError(`Migration "${migrationId}" not found in ${this.scanner.directory}`);
      }

      const result: RunResult = { ran: [], skipped: [] };
      const record = await this.registry.get(migrationId);
      if (record && record.status === 'success') {
        this.assertUnchanged(file, record.checksum);
        result.skipped.push(migrationId);
        return result;
      }
      await this.apply(file, result);
      return result;
    });
  }

  async getStatus(): Promise<MigrationStatusEntry[]> {
    await this.registry.ensure();
    const files = this.scanner.scan();
    const applied = await this.registry.all();

    return files.map((file) => {
      const record = applied.get(file.migrationId);
      return {
        migrationId: file.migrationId,
        name: file.name,
        checksum: file.checksum,
        status: record ? record.status : 'pending',
        applied: record?.status === 'success',
        executedAt: record?.executed_at,
        checksumMismatch: record?.status === 'success' && record.checksum !== file.checksum,
      };
    });
  }

  private assertUnchanged(file: MigrationFile, recordedChecksum: string): void {
    if (recordedChecksum !== file.checksum) {
      throw new MigrationError(
        `Migration "${file.name}" was modified after it was applied ` +
          `(checksum ${recordedChecksum.slice(0, 12)}… → ${file.checksum.slice(0, 12)}…). ` +
          `Applied migrations are immutable — add a new migration instead.`,
      );
    }
  }

  private async apply(file: MigrationFile, result: RunResult): Promise<void> {
    try {
      await this.executor.execute(file);
      await this.registry.record(file, 'success');
      result.ran.push(file.migrationId);
    } catch (e) {
      await this.registry.record(file, 'failed').catch(() => undefined);
      result.failed = { migrationId: file.migrationId, name: file.name, error: (e as Error).message };
      throw new MigrationError(`Migration run stopped at "${file.name}": ${(e as Error).message}`, result);
    }
  }

  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    if (this.running) {
      throw new MigrationError('A migration run is already in progress — migrations never run in parallel.');
    }
    this.running = true;
    try {
      return await fn();
    } finally {
      this.running = false;
    }
  }
}
