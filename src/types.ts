export interface Baseline {
  id: string;
  jobId: string;
  name: string;
  sourceUrl: string;
  viewport: { width: number; height: number };
  createdAt: string;
}
export interface Job {
  id: string;
  name: string;
  mode: 'url' | 'upload';
  baselineUrl?: string;
  candidateUrl?: string;
  baselineId?: string;
  viewport: { width: number; height: number };
  allowedPercent: number;
  status: 'queued' | 'running' | 'complete' | 'error';
  createdAt: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
  acceptedBaselineId?: string;
  result?: {
    changedPixels: number;
    totalPixels: number;
    changedPercent: number;
    passed: boolean;
    width: number;
    height: number;
  };
}
export async function api<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(
    url,
    body === undefined
      ? undefined
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
  );
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || 'Request failed.');
  return value as T;
}
export const artifact = (id: string, name: string) => `/api/artifacts/${id}/${name}.png`;
