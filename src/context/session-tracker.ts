/**
 * Tracks writes made during the current MCP session so we can:
 *   1. Remind the AI to sync at session end (via tool response footers)
 *   2. Auto-write a partial digest on SIGTERM / SIGINT
 */
export interface TrackedWrite {
  kind: 'decision' | 'task' | 'event' | 'feature' | 'complete';
  summary: string;
  timestamp: string;
}

export class SessionTracker {
  private writes: TrackedWrite[] = [];
  private lastDigestAt: string | null = null;
  private projectId: string | null = null;

  setProject(id: string) {
    this.projectId = id;
  }

  getProjectId(): string | null {
    return this.projectId;
  }

  record(write: Omit<TrackedWrite, 'timestamp'>) {
    this.writes.push({ ...write, timestamp: new Date().toISOString() });
  }

  markSynced() {
    this.lastDigestAt = new Date().toISOString();
    this.writes = [];
  }

  /** Number of unsynced writes since last digest */
  pendingCount(): number {
    return this.writes.length;
  }

  /** A compact list of what was written this session */
  pendingSummary(): string {
    if (!this.writes.length) return 'No changes recorded this session.';
    const lines = this.writes.map((w) => `- [${w.kind}] ${w.summary}`);
    return lines.join('\n');
  }

  /** Auto-digest text for SIGTERM writes */
  autoDigest(): string {
    const lines = [
      'Auto-generated session digest (process shutdown detected).',
      '',
      'Changes recorded this session:',
      this.pendingSummary(),
    ];
    if (this.lastDigestAt) lines.push(`\nPrevious digest written at: ${this.lastDigestAt}`);
    return lines.join('\n');
  }

  /** Footer to append to tool responses when there are pending writes */
  reminderFooter(): string | null {
    const n = this.pendingCount();
    if (n === 0) return null;
    return `\n\n---\n[Memory] ${n} change${n === 1 ? '' : 's'} recorded this session. Call orbitnest_sync_memory before closing to persist them.`;
  }
}
