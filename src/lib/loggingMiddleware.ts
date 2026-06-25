import { LogEntry } from '../types';

/**
 * Client-side logging middleware for the Campus notification system.
 * 
 * This module handles:
 * 1. Recording fetch request metrics (timing, status) to browser localStorage
 * 2. Forwarding log events to the backend evaluation service
 * 3. Maintaining a bounded history of recent events
 * 
 * All errors are swallowed silently to prevent disrupting the UI.
 */

const STORAGE_KEY = 'campus_logs_v1';
const MAX_LOGS = 200;

function isoNow(): string {
  return new Date().toISOString();
}

function saveToStorage(items: LogEntry[]): void {
  try {
    // Keep only the most recent MAX_LOGS entries
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_LOGS)));
  } catch (err) {
    // Storage may be unavailable (quota exceeded, private browsing, etc).
    // Silently fail to avoid breaking the UI.
  }
}

/**
 * Retrieve all logged events from browser storage.
 * Returns an empty array if storage is unavailable or corrupted.
 */
export function loadLogs(): LogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LogEntry[];
  } catch {
    // Storage corrupted or unavailable; start fresh
    return [];
  }
}

/**
 * Record a new log entry locally and persist to storage.
 * Prepends newest entries to the list (for reverse chronological view).
 */
export function recordLog(entry: Omit<LogEntry, 'id' | 'createdAt'>): void {
  const current = loadLogs();
  const newEntry: LogEntry = {
    // Generate a simple unique ID combining timestamp and random suffix
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: isoNow(),
    ...entry
  };
  current.unshift(newEntry);
  saveToStorage(current);
}

/**
 * Wrapper around the native fetch API that automatically:
 * - Records timing and HTTP status locally
 * - Forwards events to the backend logs endpoint
 * 
 * Meant to be transparent - errors are caught and logged,
 * then the original fetch response/error is passed through.
 */
export async function fetchAndLog(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const startTime = Date.now();
  const urlString = typeof input === 'string' ? input : input.toString();
  
  try {
    const response = await fetch(input, init);
    const elapsedMs = Date.now() - startTime;
    
    // Log locally
    recordLog({
      level: 'info',
      message: 'HTTP request completed',
      metadata: {
        url: urlString,
        status: String(response.status),
        durationMs: String(elapsedMs)
      }
    });
    
    // Attempt to forward to backend (fire-and-forget)
    try {
      void fetch('http://localhost:4000/evaluation-service/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stack: 'frontend',
          level: response.ok ? 'info' : 'error',
          package: 'http-client',
          message: `${urlString} → ${response.status}`
        })
      });
    } catch {
      // Silently fail - this is auxiliary logging, don't let it break the app
    }
    
    return response;
  } catch (err: unknown) {
    const elapsedMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);
    
    // Log locally
    recordLog({
      level: 'error',
      message: 'HTTP request failed',
      metadata: {
        url: urlString,
        reason: errorMessage,
        durationMs: String(elapsedMs)
      }
    });
    
    // Attempt to forward to backend (fire-and-forget)
    try {
      void fetch('http://localhost:4000/evaluation-service/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stack: 'frontend',
          level: 'error',
          package: 'http-client',
          message: `Request to ${urlString} failed: ${errorMessage}`
        })
      });
    } catch {
      // Silently fail
    }
    
    throw err;
  }
}
