import * as fs from 'node:fs';
import * as path from 'node:path';
import type { WorkspaceConfig } from '../types/session.types.js';
import { logger } from '../utils/logger.js';

const CONFIG_DIR = '.orbitnest';
const CONFIG_FILE = 'config.json';

export class WorkspaceService {
  private config: WorkspaceConfig | null = null;

  async detectWorkspace(startDir?: string): Promise<WorkspaceConfig | null> {
    const start = startDir || process.cwd();
    let current = start;

    while (true) {
      const configPath = path.join(current, CONFIG_DIR, CONFIG_FILE);
      if (fs.existsSync(configPath)) {
        try {
          const raw = fs.readFileSync(configPath, 'utf-8');
          this.config = JSON.parse(raw) as WorkspaceConfig;
          logger.info('Workspace config detected', { path: configPath, projectId: this.config.projectId });
          return this.config;
        } catch (err) {
          logger.warn('Failed to parse workspace config', { path: configPath, error: String(err) });
        }
      }

      const parent = path.dirname(current);
      if (parent === current) break; // reached root
      current = parent;
    }

    logger.debug('No workspace config found');
    return null;
  }

  getConfig(): WorkspaceConfig | null {
    return this.config;
  }

  saveWorkspaceConfig(config: WorkspaceConfig, dir?: string): void {
    const targetDir = path.join(dir || process.cwd(), CONFIG_DIR);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const configPath = path.join(targetDir, CONFIG_FILE);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    this.config = config;
    logger.info('Workspace config saved', { path: configPath });
  }
}
