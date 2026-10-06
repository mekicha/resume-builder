import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { makeResume } from '../test/resume';

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('VITE_API_BASE_URL', '');
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it('uses the local proxy and encodes saved resume identifiers', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ id: 'saved-id', data: makeResume() })));
  const { fetchResume } = await import('./client');
  expect((await fetchResume('saved/id with spaces')).id).toBe('saved-id');
  expect(fetch).toHaveBeenCalledExactlyOnceWith('/api/resumes/saved%2Fid%20with%20spaces');
});

it('supports a configured API URL and sends current resume data in an update', async () => {
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com/');
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ id: 'saved-id', data: makeResume() })));
  const { updateResume } = await import('./client');
  const data = { ...makeResume(), summary: 'Edited summary' };
  await updateResume('saved-id', data);
  expect(fetch).toHaveBeenCalledWith('https://api.example.com/resumes/saved-id', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
});

it('rejects a missing saved resume without treating the error body as resume data', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ detail: 'Resume not found' }), { status: 404 }));
  const { fetchResume } = await import('./client');
  await expect(fetchResume('missing-id')).rejects.toThrow('Failed to load resume');
});
