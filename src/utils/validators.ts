import { ValidationError } from './errors.js';

export function requireProjectId(projectId: string | null | undefined, sessionProjectId: string | null): string {
  const id = projectId || sessionProjectId;
  if (!id) {
    throw new ValidationError('projectId is required. Provide it directly or set an active project.');
  }
  return id;
}

export function requireProjectSlug(slug: string | null | undefined, sessionSlug: string | null): string {
  const s = slug || sessionSlug;
  if (!s) {
    throw new ValidationError('projectSlug is required. Provide it directly or set an active project.');
  }
  return s;
}

export function requireConfirmation(flag: boolean | undefined, operation: string): void {
  if (!flag) {
    throw new ValidationError(
      `${operation} requires explicit confirmation. Set the confirmation flag to true to proceed.`
    );
  }
}
