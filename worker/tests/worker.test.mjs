import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../index.js';

class MemoryKV {
  constructor() {
    this.values = new Map();
  }
  async get(key, type) {
    const value = this.values.get(key);
    if (value === undefined) return null;
    return type === 'json' ? JSON.parse(value) : value;
  }
  async put(key, value) {
    this.values.set(key, String(value));
  }
  async delete(key) {
    this.values.delete(key);
  }
}

function makeEnv() {
  return {
    SYNC_STATUS: new MemoryKV(),
    GITHUB_TOKEN: 'test-github-token',
    SYNC_STATUS_TOKEN: 'test-status-token',
    GITHUB_REPOSITORY: 'Shiro32-Nexo32/KOI',
    GITHUB_WORKFLOW: 'sync-opgg.yml',
    FRONTEND_ORIGIN: 'https://shiro32-nexo32.github.io',
  };
}

function makeRequest(path, init = {}) {
  return new Request('https://koi-sync-coordinator.example.workers.dev' + path, init);
}

function fakeGitHubFetch({ runs = [], dispatchStatus = 204 } = {}) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    calls.push({ url, method: init.method || 'GET' });
    if (url.includes('/actions/workflows/sync-opgg.yml/runs?')) {
      return Response.json({ workflow_runs: runs }, { status: 200 });
    }
    if (url.endsWith('/actions/workflows/sync-opgg.yml/dispatches')) {
      return new Response(null, { status: dispatchStatus });
    }
    return Response.json({ message: 'Unexpected URL in test: ' + url }, { status: 500 });
  };
  return {
    calls,
    restore() {
      globalThis.fetch = original;
    },
  };
}

test('GET /api/status returns the last synchronization state', async () => {
  const env = makeEnv();
  await env.SYNC_STATUS.put('sync:last-result', JSON.stringify({
    checkedAt: '2026-10-09T10:00:00.000Z',
    status: 'ok',
    successfulCount: 5,
    accountCount: 5,
    errors: [],
  }));
  const response = await worker.fetch(makeRequest('/api/status'), env, {});
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.checkedAt, '2026-10-09T10:00:00.000Z');
  assert.equal(body.status, 'ok');
});

test('POST /api/sync-status rejects requests without the shared secret', async () => {
  const env = makeEnv();
  const response = await worker.fetch(makeRequest('/api/sync-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ checkedAt: new Date().toISOString(), status: 'ok' }),
  }), env, {});
  assert.equal(response.status, 401);
});

test('POST /api/sync-status stores an authenticated result', async () => {
  const env = makeEnv();
  const checkedAt = '2026-10-09T10:00:00.000Z';
  const response = await worker.fetch(makeRequest('/api/sync-status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-status-token',
    },
    body: JSON.stringify({
      checkedAt,
      status: 'partial',
      successfulCount: 4,
      accountCount: 5,
      errors: ['Fallo simulado'],
    }),
  }), env, {});
  const body = await response.json();
  const stored = await env.SYNC_STATUS.get('sync:last-result', 'json');
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(stored.status, 'partial');
  assert.equal(stored.successfulCount, 4);
});

test('POST /api/refresh dispatches the workflow when no sync is active', async () => {
  const env = makeEnv();
  const mock = fakeGitHubFetch();
  try {
    const response = await worker.fetch(makeRequest('/api/refresh', { method: 'POST' }), env, {});
    const body = await response.json();
    assert.equal(response.status, 202);
    assert.equal(body.dispatched, true);
    assert.equal(mock.calls.length, 2);
    assert.equal(mock.calls[1].method, 'POST');
  } finally {
    mock.restore();
  }
});

test('POST /api/refresh does not dispatch a second active workflow', async () => {
  const env = makeEnv();
  const mock = fakeGitHubFetch({
    runs: [{ status: 'in_progress' }],
  });
  try {
    const response = await worker.fetch(makeRequest('/api/refresh', { method: 'POST' }), env, {});
    const body = await response.json();
    assert.equal(response.status, 202);
    assert.equal(body.dispatched, false);
    assert.equal(body.alreadyRunning, true);
    assert.equal(mock.calls.length, 1);
  } finally {
    mock.restore();
  }
});

test('scheduled handler sends the workflow dispatch', async () => {
  const env = makeEnv();
  const mock = fakeGitHubFetch();
  let scheduledPromise;
  try {
    worker.scheduled({ cron: '*/5 * * * *', scheduledTime: Date.now() }, env, {
      waitUntil(promise) {
        scheduledPromise = promise;
      },
    });
    await scheduledPromise;
    assert.equal(mock.calls.length, 2);
    assert.equal(mock.calls[1].method, 'POST');
  } finally {
    mock.restore();
  }
});


const sampleLeagueState = {
  players: {
    Shiro: { w: 4, m: 2, games: 9, level: 5 },
    Maku: { w: 3, m: 1, games: 8, level: 5 },
  },
  history: [{
    fecha: "10/10/2026, 10:00:00",
    blue: ["Shiro"],
    red: ["Maku"],
    blueData: [{ name: "Shiro", champion: "Ahri", image: null }],
    redData: [{ name: "Maku", champion: "Lux", image: null }],
    ganador: "blue",
    perdedor: "red",
    mvpBlue: "Shiro",
    mvpRed: "Maku",
  }],
};

test("GET /api/league/state reports when no shared ranking is initialized", async () => {
  const env = makeEnv();
  const response = await worker.fetch(makeRequest("/api/league/state"), env, {});
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.initialized, false);
  assert.equal(body.state, null);
});

test("POST /api/league/state initializes the shared ranking exactly once", async () => {
  const env = makeEnv();
  const response = await worker.fetch(makeRequest("/api/league/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "initialize", state: sampleLeagueState }),
  }), env, {});
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.state.revision, 1);
  assert.equal(body.state.players.Shiro.w, 4);
  assert.equal(body.state.history[0].ganador, "blue");

  const second = await worker.fetch(makeRequest("/api/league/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "initialize", state: sampleLeagueState }),
  }), env, {});
  assert.equal(second.status, 409);
});

test("POST /api/league/state saves the next revision and rejects stale overwrites", async () => {
  const env = makeEnv();
  await worker.fetch(makeRequest("/api/league/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "initialize", state: sampleLeagueState }),
  }), env, {});

  const updated = {
    ...sampleLeagueState,
    players: { ...sampleLeagueState.players, Shiro: { ...sampleLeagueState.players.Shiro, w: 5 } },
  };
  const saved = await worker.fetch(makeRequest("/api/league/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "save", revision: 1, state: updated }),
  }), env, {});
  const savedBody = await saved.json();
  assert.equal(saved.status, 200);
  assert.equal(savedBody.state.revision, 2);
  assert.equal(savedBody.state.players.Shiro.w, 5);

  const stale = await worker.fetch(makeRequest("/api/league/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "save", revision: 1, state: sampleLeagueState }),
  }), env, {});
  const staleBody = await stale.json();
  assert.equal(stale.status, 409);
  assert.equal(staleBody.state.revision, 2);
  assert.equal(staleBody.state.players.Shiro.w, 5);
});

test("POST /api/league/state rejects malformed player state", async () => {
  const env = makeEnv();
  const response = await worker.fetch(makeRequest("/api/league/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "initialize", state: { players: [], history: [] } }),
  }), env, {});
  assert.equal(response.status, 400);
});
