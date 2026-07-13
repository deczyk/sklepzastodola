const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

const PANEL_STORE_ID = process.env.PANEL_STORE_ID || "main";
const PANEL_STORE_TABLE = process.env.PANEL_STORE_TABLE || "panel_store";
const PANEL_STORE_SAVE_RPC = process.env.PANEL_STORE_SAVE_RPC || "save_panel_store";

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

async function savePanelStore(expectedVersion, data) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${encodeURIComponent(PANEL_STORE_SAVE_RPC)}`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      p_id: PANEL_STORE_ID,
      p_expected_version: Number(expectedVersion || 0),
      p_data: data || {}
    })
  });

  if (!response.ok) {
    throw new Error(`Supabase SAVE ${response.status}: ${(await responseText(response)).slice(0, 500)}`);
  }

  const result = await response.json();
  const row = Array.isArray(result) ? result[0] : result;
  return Boolean(row && row.ok);
}

async function mutatePanelStore(mutator, attempts = 5) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const store = await readPanelStore();
    const data = typeof structuredClone === "function"
      ? structuredClone(store.data || {})
      : JSON.parse(JSON.stringify(store.data || {}));
    const result = await mutator(data, store);
    if (await savePanelStore(store.version, data)) {
      return { result, data, version: store.version + 1 };
    }
  }

  throw new Error(`Konflikt wersji danych po ${attempts} probach.`);
}

module.exports = {
  hasPanelStoreConfig,
  panelStoreConfigStatus,
  readPanelStore,
  savePanelStore,
  mutatePanelStore
};
