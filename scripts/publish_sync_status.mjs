import fs from 'node:fs/promises';

const statusUrl = process.env.KOI_SYNC_STATUS_URL;
const statusToken = process.env.KOI_SYNC_STATUS_TOKEN;

if (!statusUrl || !statusToken) {
  console.log('KOI_SYNC_STATUS_URL / KOI_SYNC_STATUS_TOKEN no configurados; se omite el callback de estado.');
  process.exit(0);
}

const syncOutcome = process.env.KOI_SYNC_STEP_OUTCOME || 'unknown';
const commitOutcome = process.env.KOI_COMMIT_STEP_OUTCOME || 'unknown';
const snapshotPath = process.env.KOI_SYNC_STATUS_FILE || '/tmp/koi-live-generated.json';
let snapshot = null;

try {
  snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf8'));
} catch {
  // If the sync script failed before writing a new file, report an error below.
}

let status = 'error';
if (commitOutcome === 'failure') {
  status = 'error';
} else if (snapshot?.status === 'partial') {
  status = 'partial';
} else if (snapshot?.status === 'ok' && syncOutcome === 'success') {
  status = 'ok';
}

const body = {
  checkedAt: new Date().toISOString(),
  status,
  successfulCount: snapshot?.meta?.successfulCount ?? null,
  accountCount: snapshot?.meta?.accountCount ?? snapshot?.players?.length ?? null,
  generatedAt: snapshot?.generatedAt ?? null,
  errors: Array.isArray(snapshot?.errors)
    ? snapshot.errors
    : status === 'error'
      ? ['La sincronización no terminó correctamente o no generó un snapshot nuevo.']
      : [],
  message: snapshot?.meta?.message ?? (
    status === 'ok'
      ? 'Sincronización completada.'
      : status === 'partial'
        ? 'Sincronización parcial. Consulta los errores para ver las cuentas que fallaron.'
        : 'La sincronización ha fallado; se conserva el último snapshot publicado.'
  ),
  workflowOutcome: syncOutcome,
};

try {
  const response = await fetch(statusUrl, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + statusToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    console.warn('El coordinador de Cloudflare rechazó el estado: HTTP ' + response.status);
  } else {
    console.log('Estado de sincronización comunicado al coordinador: ' + status);
  }
} catch (error) {
  console.warn('No se pudo comunicar el estado a Cloudflare:', error instanceof Error ? error.message : String(error));
}
