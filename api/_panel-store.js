const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

const PANEL_STORE_ID = process.env.PANEL_STORE_ID || "main";
const PANEL_STORE_TABLE = process.env.PANEL_STORE_TABLE || "panel_store";
const PANEL_STORE_SAVE_RPC = process.env.PANEL_STORE_SAVE_RPC || "save_panel_store";
const PANEL_STORE_BACKUP_LIMIT = 10;

function hasPanelStoreConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_SECRET_KEY);
}

function panelStoreConfigStatus() {
  return {
    hasSupabaseUrl: Boolean(SUPABASE_URL),
    hasSupabaseSecretKey: Boolean(SUPABASE_SECRET_KEY),
    table: PANEL_STORE_TABLE,
    saveRpc: PANEL_STORE_SAVE_RPC,
    storeId: PANEL_STORE_ID
  };
}

function headers(extra = {}) {
  return {
    apikey: SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
    ...extra
  };
}

async function responseText(response) {
  try {
    return await response.text();
  } catch (e) {
    return "";
  }
}

async function readPanelStore() {
  const url = `${SUPABASE_URL}/rest/v1/${encodeURIComponent(PANEL_STORE_TABLE)}?id=eq.${encodeURIComponent(PANEL_STORE_ID)}&select=data,version`;
  const response = await fetch(url, { headers: headers() });

  if (!response.ok) {
    throw new Error(`Supabase GET ${response.status}: ${(await responseText(response)).slice(0, 500)}`);
  }

  const rows = await response.json();
  if (!Array.isArray(rows) || !rows.length) {
    return { data: {}, version: 0 };
  }

  return {
    data: rows[0].data || {},
    version: Number(rows[0].version || 1)
  };
}

async function readPanelStoreVersion() {
  const url = `${SUPABASE_URL}/rest/v1/${encodeURIComponent(PANEL_STORE_TABLE)}?id=eq.${encodeURIComponent(PANEL_STORE_ID)}&select=version`;
  const response = await fetch(url, { headers: headers() });

  if (!response.ok) {
    throw new Error(`Supabase GET ${response.status}: ${(await responseText(response)).slice(0, 500)}`);
  }

  const rows = await response.json();
  if (!Array.isArray(rows) || !rows.length) return 0;
  return Number(rows[0].version || 1);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function timestampValue(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function historyEntryKey(entry) {
  if (!entry || typeof entry !== "object") return "";
  if (entry._syncId) return String(entry._syncId);
  return [entry.data || "", entry.kto || "", entry.tekst || "", entry.audioName || ""]
    .map(value => String(value).trim())
    .join("|");
}

function mergeClientHistory(currentClient, incomingClient) {
  const deleted = new Set([
    ...(Array.isArray(currentClient._deletedHistoryIds) ? currentClient._deletedHistoryIds : []),
    ...(Array.isArray(incomingClient._deletedHistoryIds) ? incomingClient._deletedHistoryIds : [])
  ].map(String));
  const merged = [];
  const seen = new Set();

  [...(currentClient.historia || []), ...(incomingClient.historia || [])].forEach(entry => {
    const key = historyEntryKey(entry);
    if (!key || deleted.has(key) || seen.has(key)) return;
    seen.add(key);
    merged.push(entry);
  });

  merged.sort((a, b) => timestampValue(a && a.data) - timestampValue(b && b.data));
  return { historia: merged, deletedHistoryIds: Array.from(deleted) };
}

function mergePanelClients(currentData, incomingData) {
  const currentClients = Array.isArray(currentData.klienci) ? currentData.klienci : [];
  const incomingClients = Array.isArray(incomingData.klienci) ? incomingData.klienci : [];
  const deletedClientIds = new Set([
    ...(Array.isArray(currentData._deletedClientIds) ? currentData._deletedClientIds : []),
    ...(Array.isArray(incomingData._deletedClientIds) ? incomingData._deletedClientIds : [])
  ].map(String));
  const byId = new Map();

  currentClients.forEach(client => {
    if (client && client.id) byId.set(String(client.id), { current: client });
  });
  incomingClients.forEach(client => {
    if (!client || !client.id) return;
    const id = String(client.id);
    byId.set(id, { ...(byId.get(id) || {}), incoming: client });
  });

  const clients = [];
  byId.forEach((pair, id) => {
    if (deletedClientIds.has(id)) return;
    if (!pair.current) {
      clients.push(pair.incoming);
      return;
    }
    if (!pair.incoming) {
      clients.push(pair.current);
      return;
    }

    const history = mergeClientHistory(pair.current, pair.incoming);
    // Wersja całego magazynu chroni zapis przed konfliktem. Pola z żądania muszą wygrać;
    // czas z telefonu lub komputera nie może po cichu przywrócić starszej karty klienta.
    clients.push({
      ...pair.current,
      ...pair.incoming,
      historia: history.historia,
      _deletedHistoryIds: history.deletedHistoryIds
    });
  });

  return { clients, deletedClientIds: Array.from(deletedClientIds) };
}

function protectPanelData(currentData, incomingData) {
  const current = currentData && typeof currentData === "object" ? currentData : {};
  const incoming = incomingData && typeof incomingData === "object" ? cloneJson(incomingData) : {};
  const mergedClients = mergePanelClients(current, incoming);
  incoming.klienci = mergedClients.clients;
  incoming._deletedClientIds = mergedClients.deletedClientIds;
  return incoming;
}

function backupId(version) {
  return `backup_${PANEL_STORE_ID}_${Number(version || 0)}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function createPanelStoreBackup(store) {
  if (!store || Number(store.version || 0) < 1 || !store.data || !Object.keys(store.data).length) return;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${encodeURIComponent(PANEL_STORE_TABLE)}`, {
    method: "POST",
    headers: headers({
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    }),
    body: JSON.stringify({
      id: backupId(store.version),
      data: store.data,
      version: Number(store.version || 1),
      updated_at: new Date().toISOString()
    })
  });
  if (!response.ok) {
    throw new Error(`Supabase BACKUP ${response.status}: ${(await responseText(response)).slice(0, 500)}`);
  }

  // Sprzątanie jest techniczne i nie musi blokować każdego zapisu użytkownika.
  // Robimy je partiami co 10 wersji; kopia bezpieczeństwa nadal powstaje przed KAŻDYM zapisem.
  if (Number(store.version || 0) % PANEL_STORE_BACKUP_LIMIT !== 0) return;

  const listUrl = `${SUPABASE_URL}/rest/v1/${encodeURIComponent(PANEL_STORE_TABLE)}?id=like.${encodeURIComponent(`backup_${PANEL_STORE_ID}_*`)}&select=id&order=updated_at.desc&offset=${PANEL_STORE_BACKUP_LIMIT}`;
  const listResponse = await fetch(listUrl, { headers: headers() });
  if (!listResponse.ok) return;
  const oldRows = await listResponse.json();
  for (const row of Array.isArray(oldRows) ? oldRows : []) {
    if (!row || !row.id) continue;
    await fetch(`${SUPABASE_URL}/rest/v1/${encodeURIComponent(PANEL_STORE_TABLE)}?id=eq.${encodeURIComponent(row.id)}`, {
      method: "DELETE",
      headers: headers()
    });
  }
}

async function listPanelStoreBackups() {
  const url = `${SUPABASE_URL}/rest/v1/${encodeURIComponent(PANEL_STORE_TABLE)}?id=like.${encodeURIComponent(`backup_${PANEL_STORE_ID}_*`)}&select=id,version,updated_at&order=updated_at.desc&limit=${PANEL_STORE_BACKUP_LIMIT}`;
  const response = await fetch(url, { headers: headers() });
  if (!response.ok) {
    throw new Error(`Supabase BACKUP LIST ${response.status}: ${(await responseText(response)).slice(0, 500)}`);
  }
  return await response.json();
}

async function readPanelStoreBackup(id) {
  const safeId = String(id || "");
  if (!safeId.startsWith(`backup_${PANEL_STORE_ID}_`)) throw new Error("Invalid backup id.");
  const url = `${SUPABASE_URL}/rest/v1/${encodeURIComponent(PANEL_STORE_TABLE)}?id=eq.${encodeURIComponent(safeId)}&select=id,data,version,updated_at`;
  const response = await fetch(url, { headers: headers() });
  if (!response.ok) {
    throw new Error(`Supabase BACKUP GET ${response.status}: ${(await responseText(response)).slice(0, 500)}`);
  }
  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function savePanelStore(expectedVersion, data) {
  const current = await readPanelStore();
  if (Number(current.version || 0) !== Number(expectedVersion || 0)) return false;
  const protectedData = protectPanelData(current.data, data);
  await createPanelStoreBackup(current);
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${encodeURIComponent(PANEL_STORE_SAVE_RPC)}`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      p_id: PANEL_STORE_ID,
      p_expected_version: Number(expectedVersion || 0),
      p_data: protectedData
    })
  });

  if (!response.ok) {
    throw new Error(`Supabase SAVE ${response.status}: ${(await responseText(response)).slice(0, 500)}`);
  }

  const result = await response.json();
  const row = Array.isArray(result) ? result[0] : result;
  if (!row || !row.ok) return false;
  return {
    ok: true,
    data: protectedData,
    version: Number(row.version || (Number(expectedVersion || 0) + 1))
  };
}

async function mutatePanelStore(mutator, attempts = 5) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const store = await readPanelStore();
    const data = typeof structuredClone === "function"
      ? structuredClone(store.data || {})
      : JSON.parse(JSON.stringify(store.data || {}));
    const result = await mutator(data, store);
    const saved = await savePanelStore(store.version, data);
    if (saved) {
      return { result, data: saved.data, version: saved.version };
    }
  }

  throw new Error(`Konflikt wersji danych po ${attempts} probach.`);
}

module.exports = {
  hasPanelStoreConfig,
  panelStoreConfigStatus,
  readPanelStore,
  readPanelStoreVersion,
  listPanelStoreBackups,
  readPanelStoreBackup,
  savePanelStore,
  mutatePanelStore,
  protectPanelData
};
