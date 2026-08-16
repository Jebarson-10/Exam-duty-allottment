// Serverless API client for Cloudflare Pages Functions (D1 backend).
// All calls are fault-tolerant: when no backend is deployed the portal
// transparently runs in Local-First Standalone Mode (localStorage only).

export type CloudStatus = 'checking' | 'online' | 'offline' | 'syncing';

export interface SyncPayload {
  blocks: unknown[];
  schools: unknown[];
  centres: unknown[];
  teachers: unknown[];
  dutyHistory: unknown[];
  examCycles: unknown[];
  allotments: unknown[];
  batches: unknown[];
  auditLogs: unknown[];
  activeCycle: string | null;
}

const BASE = '/api';
const TIMEOUT_MS = 5000;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    });
    if (!res.ok) {
      throw new Error(`API ${path} failed: ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  /** Probe the serverless backend. Returns true when D1 is reachable. */
  async checkHealth(): Promise<boolean> {
    try {
      const res = await request<{ ok: boolean }>('/health');
      return res.ok === true;
    } catch {
      return false;
    }
  },

  /** Pull the full district dataset from D1. */
  async fetchSync(): Promise<SyncPayload> {
    return request<SyncPayload>('/sync');
  },

  /** Push the full district snapshot to D1 (atomic bulk replace). */
  async pushSync(payload: SyncPayload): Promise<{ success: boolean; syncedAt: string }> {
    return request<{ success: boolean; syncedAt: string }>('/sync', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
