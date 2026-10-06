import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer as createNetServer } from 'node:net';
import { tmpdir } from 'node:os';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { createServer } from 'vite';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backend = resolve(frontend, '../backend');
const python = process.env.PYTHON_BIN || join(backend, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const temporary = await mkdtemp(join(tmpdir(), 'resume-api-check-'));
const reservation = createNetServer();
await new Promise((done) => reservation.listen(0, '127.0.0.1', done));
const backendPort = reservation.address().port;
await new Promise((done) => reservation.close(done));
let server;
let logs = '';
const api = spawn(python, ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', String(backendPort)], {
  cwd: backend, env: { ...process.env, RESUME_DATA_DIR: temporary }, stdio: ['ignore', 'pipe', 'pipe'],
});
api.stdout.on('data', (chunk) => { logs += chunk; });
api.stderr.on('data', (chunk) => { logs += chunk; });
let startError;
api.on('error', (error) => { startError = error; });

try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (startError || api.exitCode !== null) throw new Error(`Backend could not start: ${startError?.message || logs}`);
    try {
      ready = (await fetch(`http://127.0.0.1:${backendPort}/health`)).ok;
    } catch { /* Wait for startup. */ }
    if (ready) break;
    await delay(100);
  }
  assert.ok(ready, `Backend startup timed out: ${logs}`);
  // Use the project's real Vite config/rewrite with an isolated backend port.
  server = await createServer({ root: frontend, server: {
    host: '127.0.0.1', port: 0, strictPort: true,
    proxy: { '/api': { target: `http://127.0.0.1:${backendPort}` } },
  } });
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const templates = await (await fetch(`${origin}/api/templates`)).json();
  assert.deepEqual(templates.map((item) => item.id), ['classic', 'modern', 'compact']);
  const page = await fetch(origin);
  assert.ok((await page.text()).includes('/src/main.tsx'));

  const data = { template_id: 'modern', basics: { full_name: 'Ada Lovelace' }, summary: 'Original summary' };
  const created = await fetch(`${origin}/api/resumes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  assert.equal(created.status, 200);
  const record = await created.json();
  const updated = { ...record.data, summary: 'Updated summary', skills: ['TypeScript', 'React'] };
  const saved = await fetch(`${origin}/api/resumes/${record.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
  assert.equal(saved.status, 200);
  const reopened = await (await fetch(`${origin}/api/resumes/${record.id}`)).json();
  assert.deepEqual(reopened.data, updated);
  const pdf = await fetch(`${origin}/api/resumes/${record.id}/export/pdf`, { method: 'POST' });
  assert.equal(pdf.headers.get('Content-Type'), 'application/pdf');
  const bytes = Buffer.from(await pdf.arrayBuffer());
  const inspected = spawnSync(python, ['-c',
    'import sys; from io import BytesIO; from pypdf import PdfReader; text="\\n".join(p.extract_text() for p in PdfReader(BytesIO(sys.stdin.buffer.read())).pages); assert "Ada Lovelace" in text and "Updated summary" in text and "TypeScript, React" in text and "Original summary" not in text; print("Updated PDF text verified")',
  ], { input: bytes, encoding: 'utf-8' });
  assert.equal(inspected.status, 0, inspected.stderr);
  console.log('PASS: Vite → FastAPI template/create/update/reopen/export flow');
  console.log(inspected.stdout.trim());
} finally {
  await server?.close();
  if (api.exitCode === null) api.kill('SIGTERM');
  await rm(temporary, { recursive: true, force: true });
}
