import { SafetyError } from '../utils/errors.js';
import { isAuthTable } from './auth-table.guard.js';

export function guardTableOperation(tableName: string, operation: string): void {
  if (isAuthTable(tableName)) {
    const upperOp = operation.toUpperCase();
    if (['INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER'].includes(upperOp)) {
      throw new SafetyError(
        `Cannot perform ${upperOp} on auth table "${tableName}". Use project auth APIs instead.`,
        { table: tableName, operation: upperOp }
      );
    }
  }
}

export function guardDestructiveOperation(operation: string, confirmFlag: boolean): void {
  if (!confirmFlag) {
    throw new SafetyError(
      `${operation} is a destructive operation and requires explicit confirmation.`,
      { hint: 'Set the confirmation flag to true to proceed.' }
    );
  }
}

export function guardBulkOperation(count: number, threshold: number = 1000, confirmFlag: boolean = false): void {
  if (count > threshold && !confirmFlag) {
    throw new SafetyError(
      `Bulk operation affects ${count} records (threshold: ${threshold}). Set confirmation flag to true to proceed.`,
      { recordCount: count, threshold }
    );
  }
}

export function guardRlsDisable(tableName: string): void {
  if (isAuthTable(tableName)) {
    throw new SafetyError(
      `Cannot disable RLS on auth table "${tableName}". Auth tables must always have RLS enabled.`,
      { table: tableName }
    );
  }
}
