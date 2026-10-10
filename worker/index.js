const DEFAULT_REPOSITORY = "Shiro32-Nexo32/KOI";
const DEFAULT_WORKFLOW = "sync-opgg.yml";
const MAIN_BRANCH = "main";
const MANUAL_COOLDOWN_MS = 60_000;
const DISPATCH_GUARD_MS = 4 * 60_000;
const LEAGUE_STATE_KEY = "league-of-colegones:shared-state:v1";
const MAX_LEAGUE_PAYLOAD_BYTES = 500_000;

function responseJson(request, env, body, status = 200) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  const origin = request.headers.get("Origin");
  const allowedOrigins = new Set([
    env.FRONTEND_ORIGIN || "https://shiro32-nexo32.github.io",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
  ]);
  if (origin && allowedOrigins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  return new Response(body === null ? null : JSON.stringify(body), { status, headers });
}

function corsOptions(request, env) {
  const response = responseJson(request, env, null, 204);
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Max-Age", "86400");
  return new Response(null, { status: 204, headers });
}

function repositoryName(env) {
  return env.GITHUB_REPOSITORY || DEFAULT_REPOSITORY;
}

function workflowName(env) {
  return env.GITHUB_WORKFLOW || DEFAULT_WORKFLOW;
}

async function githubApi(env, endpoint, options = {}) {
  if (!env.GITHUB_TOKEN) throw new Error("Falta configurar el secreto GITHUB_TOKEN en Cloudflare.");
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/vnd.github+json");
  headers.set("Authorization", "Bearer " + env.GITHUB_TOKEN);
  headers.set("X-GitHub-Api-Version", "2022-11-28");
  headers.set("User-Agent", "koi-sync-coordinator");
  return fetch("https://api.github.com/repos/" + repositoryName(env) + endpoint, {
    ...options,
    headers,
  });
}

async function syncAlreadyRunning(env) {
  const endpoint = "/actions/workflows/" + encodeURIComponent(workflowName(env)) +
    "/runs?branch=" + encodeURIComponent(MAIN_BRANCH) + "&per_page=10";
  const response = await githubApi(env, endpoint);
  if (!response.ok) {
    throw new Error("GitHub no pudo comprobar el estado del workflow (HTTP " + response.status + ").");
  }
  const payload = await response.json();
  const activeStates = new Set(["queued", "in_progress", "requested", "waiting", "pending"]);
  return (payload.workflow_runs || []).some((run) => activeStates.has(run.status));
}

async function requestSync(env) {
  if (!env.SYNC_STATUS) throw new Error("Falta enlazar el namespace KV SYNC_STATUS.");
  const now = Date.now();
  const previousDispatch = await env.SYNC_STATUS.get("dispatch:last-at", "json");
  if (previousDispatch && now - previousDispatch.timestamp < DISPATCH_GUARD_MS) {
    return {
      ok: true,
      dispatched: false,
      alreadyRunning: true,
      queuedAt: previousDispatch.dispatchedAt,
      message: "La sincronización ya se ha solicitado recientemente.",
    };
  }

  if (await syncAlreadyRunning(env)) {
    return {
      ok: true,
      dispatched: false,
      alreadyRunning: true,
      message: "Ya hay una sincronización de KOI en curso.",
    };
  }

  const dispatchedAt = new Date(now).toISOString();
  await env.SYNC_STATUS.put(
    "dispatch:last-at",
    JSON.stringify({ timestamp: now, dispatchedAt }),
    { expirationTtl: 300 },
  );

  try {
    const endpoint = "/actions/workflows/" + encodeURIComponent(workflowName(env)) + "/dispatches";
    const response = await githubApi(env, endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref: MAIN_BRANCH }),
    });
    if (!response.ok) {
      throw new Error("GitHub rechazó la sincronización (HTTP " + response.status + "). Comprueba Actions: write en el token.");
    }
    await env.SYNC_STATUS.delete("scheduler:last-error");
    return {
      ok: true,
      dispatched: true,
      queuedAt: dispatchedAt,
      message: "Sincronización enviada a GitHub Actions.",
    };
  } catch (error) {
    await env.SYNC_STATUS.delete("dispatch:last-at");
    throw error;
  }
}

async function handleStatus(request, env) {
  const lastSync = await env.SYNC_STATUS.get("sync:last-result", "json");
  const schedulerError = await env.SYNC_STATUS.get("scheduler:last-error", "json");
  return responseJson(request, env, {
    ok: true,
    configured: Boolean(env.GITHUB_TOKEN && env.SYNC_STATUS_TOKEN && env.SYNC_STATUS),
    checkedAt: lastSync?.checkedAt || null,
    status: lastSync?.status || "unknown",
    successfulCount: lastSync?.successfulCount ?? null,
    accountCount: lastSync?.accountCount ?? null,
    errors: Array.isArray(lastSync?.errors) ? lastSync.errors : [],
    message: lastSync?.message || null,
    schedulerError: schedulerError?.message || null,
  });
}

async function handleSyncStatus(request, env) {
  if (!env.SYNC_STATUS_TOKEN) {
    return responseJson(request, env, { ok: false, error: "El callback de estado no está configurado." }, 503);
  }
  const authorization = request.headers.get("Authorization") || "";
  if (authorization !== "Bearer " + env.SYNC_STATUS_TOKEN) {
    return responseJson(request, env, { ok: false, error: "No autorizado." }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return responseJson(request, env, { ok: false, error: "JSON no válido." }, 400);
  }

  const checkedAt = typeof body.checkedAt === "string" && Number.isFinite(Date.parse(body.checkedAt))
    ? new Date(body.checkedAt).toISOString()
    : new Date().toISOString();
  const allowedStatuses = new Set(["ok", "partial", "error"]);
  if (!allowedStatuses.has(body.status)) {
    return responseJson(request, env, { ok: false, error: "Estado de sincronización no válido." }, 400);
  }

  const snapshot = {
    checkedAt,
    status: body.status,
    successfulCount: Number.isFinite(body.successfulCount) ? body.successfulCount : null,
    accountCount: Number.isFinite(body.accountCount) ? body.accountCount : null,
    generatedAt: typeof body.generatedAt === "string" ? body.generatedAt : null,
    errors: Array.isArray(body.errors)
      ? body.errors.slice(0, 10).map((item) => String(item).slice(0, 300))
      : [],
    message: typeof body.message === "string" ? body.message.slice(0, 500) : null,
    workflowOutcome: typeof body.workflowOutcome === "string" ? body.workflowOutcome : null,
  };
  await env.SYNC_STATUS.put("sync:last-result", JSON.stringify(snapshot));
  return responseJson(request, env, { ok: true, checkedAt });
}


function leagueCounter(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1_000_000_000, Math.trunc(number))) : 0;
}

function leagueString(value, maxLength = 120) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function leaguePlayerName(value) {
  const name = leagueString(value, 32);
  return name || null;
}

function sanitizeLeagueHistoryPlayers(value, fallbackNames = []) {
  const players = Array.isArray(value) ? value : fallbackNames;
  return players.slice(0, 10).map((rawPlayer) => {
    const player = typeof rawPlayer === "string" ? { name: rawPlayer } :
      (rawPlayer && typeof rawPlayer === "object" ? rawPlayer : {});
    const name = leaguePlayerName(player.name) || "Desconocido";
    const champion = leagueString(player.champion, 80) || null;
    const image = leagueString(player.image, 500) || null;
    return { name, champion, image };
  });
}

function sanitizeLeagueHistory(value) {
  if (!Array.isArray(value)) return null;
  return value.slice(0, 20)
    .filter((match) =>
      match && typeof match === "object" &&
      Array.isArray(match.blue) && Array.isArray(match.red) &&
      ["blue", "red"].includes(match.ganador)
    )
    .map((match) => {
      const blue = match.blue.slice(0, 10).map(leaguePlayerName).filter(Boolean);
      const red = match.red.slice(0, 10).map(leaguePlayerName).filter(Boolean);
      const perdedor = ["blue", "red"].includes(match.perdedor)
        ? match.perdedor
        : (match.ganador === "blue" ? "red" : "blue");
      return {
        fecha: leagueString(match.fecha, 100) || "Fecha desconocida",
        blue,
        red,
        blueData: sanitizeLeagueHistoryPlayers(match.blueData, blue),
        redData: sanitizeLeagueHistoryPlayers(match.redData, red),
        ganador: match.ganador,
        perdedor,
        mvpBlue: leaguePlayerName(match.mvpBlue),
        mvpRed: leaguePlayerName(match.mvpRed),
      };
    });
}

function sanitizeLeagueState(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const sourcePlayers = value.players;
  if (!sourcePlayers || typeof sourcePlayers !== "object" || Array.isArray(sourcePlayers)) return null;
  const entries = Object.entries(sourcePlayers);
  if (entries.length > 500) return null;

  const players = {};
  for (const [rawName, rawStats] of entries) {
    const name = leaguePlayerName(rawName);
    if (!name || !rawStats || typeof rawStats !== "object" || Array.isArray(rawStats)) continue;
    const level = Number(rawStats.level);
    players[name] = {
      w: leagueCounter(rawStats.w),
      m: leagueCounter(rawStats.m),
      games: leagueCounter(rawStats.games),
      level: Number.isFinite(level) ? Math.max(0, Math.min(5, level)) : 3,
    };
  }

  const history = sanitizeLeagueHistory(value.history);
  if (!history) return null;
  return { players, history };
}

async function handleLeagueState(request, env) {
  if (!env.SYNC_STATUS) {
    return responseJson(request, env, { ok: false, error: "El almacenamiento compartido no está configurado." }, 503);
  }

  if (request.method === "GET") {
    const state = await env.SYNC_STATUS.get(LEAGUE_STATE_KEY, "json");
    return responseJson(request, env, { ok: true, initialized: Boolean(state), state });
  }

  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (declaredLength > MAX_LEAGUE_PAYLOAD_BYTES) {
    return responseJson(request, env, { ok: false, error: "La copia es demasiado grande." }, 413);
  }

  let payload;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_LEAGUE_PAYLOAD_BYTES) {
      return responseJson(request, env, { ok: false, error: "La copia es demasiado grande." }, 413);
    }
    payload = JSON.parse(raw);
  } catch {
    return responseJson(request, env, { ok: false, error: "JSON no válido." }, 400);
  }

  const state = sanitizeLeagueState(payload?.state);
  if (!state || !["initialize", "save"].includes(payload?.action)) {
    return responseJson(request, env, { ok: false, error: "La copia del ranking no tiene un formato válido." }, 400);
  }

  const current = await env.SYNC_STATUS.get(LEAGUE_STATE_KEY, "json");
  if (payload.action === "initialize") {
    if (current) {
      return responseJson(request, env, {
        ok: false, error: "El ranking compartido ya está inicializado.", state: current,
      }, 409);
    }
    const saved = { ...state, revision: 1, updatedAt: new Date().toISOString() };
    await env.SYNC_STATUS.put(LEAGUE_STATE_KEY, JSON.stringify(saved));
    return responseJson(request, env, { ok: true, initialized: true, state: saved }, 201);
  }

  if (!current) {
    return responseJson(request, env, {
      ok: false, error: "Todavía no hay un ranking compartido inicializado.", initialized: false,
    }, 409);
  }
  if (!Number.isInteger(payload.revision) || payload.revision !== current.revision) {
    return responseJson(request, env, {
      ok: false,
      error: "El ranking cambió desde otro dispositivo. No se han guardado estos cambios para evitar sobrescribir datos.",
      state: current,
    }, 409);
  }

  const saved = {
    ...state,
    revision: current.revision + 1,
    updatedAt: new Date().toISOString(),
  };
  await env.SYNC_STATUS.put(LEAGUE_STATE_KEY, JSON.stringify(saved));
  return responseJson(request, env, { ok: true, initialized: true, state: saved });
}

async function handleRefresh(request, env) {
  if (!env.GITHUB_TOKEN || !env.SYNC_STATUS_TOKEN || !env.SYNC_STATUS) {
    return responseJson(request, env, {
      ok: false,
      error: "El coordinador no está completamente configurado. Revisa los secretos y el namespace KV de Cloudflare.",
    }, 503);
  }

  const now = Date.now();
  const lastManual = await env.SYNC_STATUS.get("manual:last-at", "json");
  if (lastManual && now - lastManual.timestamp < MANUAL_COOLDOWN_MS) {
    const retryAfter = Math.max(1, Math.ceil((MANUAL_COOLDOWN_MS - (now - lastManual.timestamp)) / 1000));
    const response = responseJson(request, env, {
      ok: false,
      error: "Ya se ha solicitado una actualización hace muy poco.",
      retryAfter,
    }, 429);
    response.headers.set("Retry-After", String(retryAfter));
    return response;
  }
  await env.SYNC_STATUS.put("manual:last-at", JSON.stringify({ timestamp: now }), { expirationTtl: 60 });

  try {
    const result = await requestSync(env);
    return responseJson(request, env, result, 202);
  } catch (error) {
    console.error("No se pudo solicitar la sincronización de KOI:", error);
    return responseJson(request, env, {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo contactar con GitHub.",
    }, 502);
  }
}

async function runScheduledSync(env) {
  try {
    await requestSync(env);
  } catch (error) {
    console.error("Fallo al programar la sincronización de KOI:", error);
    if (env.SYNC_STATUS) {
      await env.SYNC_STATUS.put(
        "scheduler:last-error",
        JSON.stringify({
          at: new Date().toISOString(),
          message: error instanceof Error ? error.message.slice(0, 400) : "Error desconocido",
        }),
        { expirationTtl: 3600 },
      );
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return corsOptions(request, env);

    if (request.method === "GET" && url.pathname === "/api/health") {
      return responseJson(request, env, { ok: true, service: "koi-sync-coordinator" });
    }
    if (request.method === "GET" && url.pathname === "/api/status") {
      if (!env.SYNC_STATUS) return responseJson(request, env, { ok: false, error: "KV no está configurado." }, 503);
      return handleStatus(request, env);
    }
    if ((request.method === "GET" || request.method === "POST") && url.pathname === "/api/league/state") {
      return handleLeagueState(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/refresh") {
      return handleRefresh(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/sync-status") {
      if (!env.SYNC_STATUS) return responseJson(request, env, { ok: false, error: "KV no está configurado." }, 503);
      return handleSyncStatus(request, env);
    }
    return responseJson(request, env, { ok: false, error: "Ruta no encontrada." }, 404);
  },

  async scheduled(_event, env, context) {
    context.waitUntil(runScheduledSync(env));
  },
};
