import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { logger } from '../utils/logger.js';
import type { StoredCredentials } from '../types/session.types.js';

const CREDENTIALS_DIR = path.join(os.homedir(), '.orbitnest');
const CREDENTIALS_FILE = path.join(CREDENTIALS_DIR, 'credentials.json');

export function loadCredentials(): StoredCredentials | null {
  try {
    if (!fs.existsSync(CREDENTIALS_FILE)) {
      logger.debug('No credentials file found');
      return null;
    }
    const raw = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
    return JSON.parse(raw) as StoredCredentials;
  } catch (err) {
    logger.warn('Failed to load credentials', { error: String(err) });
    return null;
  }
}

export function saveCredentials(credentials: StoredCredentials): void {
  try {
    if (!fs.existsSync(CREDENTIALS_DIR)) {
      fs.mkdirSync(CREDENTIALS_DIR, { recursive: true, mode: 0o700 });
    }
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), { mode: 0o600 });
    logger.info('Credentials saved');
  } catch (err) {
    logger.error('Failed to save credentials', { error: String(err) });
    throw err;
  }
}

export function clearCredentials(): void {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      fs.unlinkSync(CREDENTIALS_FILE);
      logger.info('Credentials cleared');
    }
  } catch (err) {
    logger.warn('Failed to clear credentials', { error: String(err) });
  }
}
