const crypto = require("crypto");

const PANEL_PASSWORD = process.env.PANEL_PASSWORD;
const PANEL_BASIC_USER = process.env.PANEL_BASIC_USER;
const PANEL_BASIC_PASSWORD = process.env.PANEL_BASIC_PASSWORD;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
const GOOGLE_DRIVE_FOLDER_ID = "0ACFzxkUrgaMkUk9PVA";
const DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
// Załączniki notatek i oferty klientów lądują w osobnych podfolderach. Zdjęcia i nagrania
// nigdy nie trafiają do katalogu dokumentów. Oferty mogą być dołączone do pełnej synchronizacji,
// aby panel przypisał je bezpośrednio do kart klientów.
const NOTES_PHOTOS_FOLDER_NAME = "Zdjęcia z notatek";
const NOTES_AUDIO_FOLDER_NAME = "Nagrania z notatek";
const CLIENT_OFFERS_FOLDER_NAME = "Oferty klientów";

let tokenCache = { token: "", expiresAt: 0 };
let notesPhotosFolderIdCache = "";
let notesAudioFolderIdCache = "";
let clientOffersFolderIdCache = "";
const clientOfferFolderIdsCache = new Map();

function getBasicAuth(req) {
  const header = req.headers.authorization || "";
  const [scheme, encoded] = header.split(" ");
  if (scheme !== "Basic" || !encoded) return null;
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator === -1) return null;
  return {
    user: decoded.slice(0, separator),
    password: decoded.slice(separator + 1)
  };
}

function isAuthorized(req) {
  const password = req.headers["x-panel-password"];
  const allowed = [PANEL_PASSWORD, PANEL_BASIC_PASSWORD].filter(Boolean);
  if (password && allowed.includes(password)) return true;
  const basic = getBasicAuth(req);
  return Boolean(
    basic &&
    PANEL_BASIC_USER &&
    PANEL_BASIC_PASSWORD &&
    basic.user === PANEL_BASIC_USER &&
    basic.password === PANEL_BASIC_PASSWORD
  );
}

function driveConfigStatus() {
  return {
    hasGoogleServiceAccountEmail: Boolean(GOOGLE_SERVICE_ACCOUNT_EMAIL),
    hasGooglePrivateKey: Boolean(GOOGLE_PRIVATE_KEY),
    hasGoogleDriveFolderId: Boolean(GOOGLE_DRIVE_FOLDER_ID),
    hasPanelPassword: Boolean(PANEL_PASSWORD),
    hasPanelBasicPassword: Boolean(PANEL_BASIC_PASSWORD)
  };
}

function assertConfig() {
  return Boolean(
    GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    GOOGLE_PRIVATE_KEY &&
    GOOGLE_DRIVE_FOLDER_ID &&
    (PANEL_PASSWORD || PANEL_BASIC_PASSWORD)
  );
}

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt(header, payload) {
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const key = GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");
  const signature = crypto.createSign("RSA-SHA256").update(data).sign(key);
  return `${data}.${base64url(signature)}`;
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache.token && tokenCache.expiresAt - 60 > now) return tokenCache.token;

  const jwt = signJwt(
    { alg: "RS256", typ: "JWT" },
    {
      iss: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      scope: "https://www.googleapis.com/auth/drive",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600
    }
  );

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error_description || json.error || "Google token request failed.");
  }

  tokenCache = {
    token: json.access_token,
    expiresAt: now + Number(json.expires_in || 3600)
  };
  return tokenCache.token;
}

function sanitizeName(value) {
  return String(value || "").trim().replace(/[\\/:*?"<>|]/g, "_").slice(0, 180);
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      return null;
    }
  }
  return req.body;
}

function decodeBase64File(value) {
  const raw = String(value || "");
  const payload = raw.includes(",") ? raw.split(",").pop() : raw;
  return Buffer.from(payload, "base64");
}

function normalizeDriveFile(file) {
  const id = file.id;
  return {
    id,
    name: file.name || "",
    mimeType: file.mimeType || "",
    size: file.size || "",
    createdTime: file.createdTime || "",
    modifiedTime: file.modifiedTime || "",
    folderPath: file.folderPath || "",
    webViewLink: file.webViewLink || (id ? `https://drive.google.com/file/d/${id}/view` : ""),
    webContentLink: file.webContentLink || (id ? `https://drive.google.com/uc?export=download&id=${id}` : "")
  };
}

async function listDriveFolder(token, folderId) {
  const files = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink)",
      orderBy: "folder,name_natural",
      pageSize: "1000",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true"
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error && json.error.message ? json.error.message : "Google Drive list failed.");
    files.push(...(json.files || []));
    pageToken = json.nextPageToken || "";
  } while (pageToken);
  return files;
}

async function listDriveFiles(token, options = {}) {
  const result = [];
  const queue = [{ id: GOOGLE_DRIVE_FOLDER_ID, path: "" }];
  let scanned = 0;

  while (queue.length) {
    const folder = queue.shift();
    scanned += 1;
    if (scanned > 250) throw new Error("Drive folder tree is too large for one panel sync.");
    const files = await listDriveFolder(token, folder.id);
    files.forEach(file => {
      const folderPath = folder.path;
      if (file.mimeType === DRIVE_FOLDER_MIME_TYPE) {
        // Załączniki z kart klientów mają świadomie NIE trafiać do zakładki "Dokumenty".
        // Pomijamy te foldery tylko na najwyższym poziomie, żeby identyczna nazwa folderu
        // użytkownika gdzieś głębiej w drzewie nie została przypadkiem ucięta.
        if (!folderPath && (
          file.name === NOTES_PHOTOS_FOLDER_NAME ||
          file.name === NOTES_AUDIO_FOLDER_NAME ||
          (file.name === CLIENT_OFFERS_FOLDER_NAME && !options.includeClientOffers)
        )) return;
        queue.push({
          id: file.id,
          path: folderPath ? `${folderPath} / ${file.name}` : file.name
        });
        return;
      }
      result.push(normalizeDriveFile({ ...file, folderPath }));
    });
  }

  return result.sort((a, b) => {
    const timeDiff = Date.parse(b.modifiedTime || "") - Date.parse(a.modifiedTime || "");
    return timeDiff || String(a.name || "").localeCompare(String(b.name || ""), "pl");
  });
}

async function findChildFolder(token, parentId, name) {
  const params = new URLSearchParams({
    q: `'${parentId}' in parents and trashed = false and mimeType = '${DRIVE_FOLDER_MIME_TYPE}' and name = '${name.replace(/'/g, "\\'")}'`,
    fields: "files(id,name)",
    pageSize: "1",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true"
  });
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error && json.error.message ? json.error.message : "Google Drive folder lookup failed.");
  return (json.files && json.files[0] && json.files[0].id) || "";
}

// Szuka WSZYSTKICH folderów o danej nazwie w całym wspólnym dysku firmowym (nie tylko
// bezpośrednich dzieci jednego folderu-rodzica). Używane tam, gdzie musimy rozpoznać
// przynależność pliku do folderu "logicznie", niezależnie od tego, jak głęboko dany
// folder jest obecnie zagnieżdżony — np. stare notatki audio sprzed przeniesienia panelu
// na wspólny dysk firmowy leżą w folderze "Nagrania z notatek" zagnieżdżonym głębiej
// (w starym, przeniesionym drzewie), a nie bezpośrednio pod głównym folderem panelu.
async function findFoldersAnywhereInDrive(token, driveId, name) {
  const params = new URLSearchParams({
    q: `trashed = false and mimeType = '${DRIVE_FOLDER_MIME_TYPE}' and name = '${name.replace(/'/g, "\\'")}'`,
    fields: "files(id,name)",
    pageSize: "100",
    corpora: "drive",
    driveId,
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true"
  });
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error && json.error.message ? json.error.message : "Google Drive folder search failed.");
  return (json.files || []).map(file => file.id).filter(Boolean);
}

async function createChildFolder(token, parentId, name) {
  const res = await fetch("https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: DRIVE_FOLDER_MIME_TYPE, parents: [parentId] })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error && json.error.message ? json.error.message : "Google Drive folder creation failed.");
  return json.id;
}

async function getNotesPhotosFolderId(token) {
  if (notesPhotosFolderIdCache) return notesPhotosFolderIdCache;
  let id = await findChildFolder(token, GOOGLE_DRIVE_FOLDER_ID, NOTES_PHOTOS_FOLDER_NAME);
  if (!id) id = await createChildFolder(token, GOOGLE_DRIVE_FOLDER_ID, NOTES_PHOTOS_FOLDER_NAME);
  notesPhotosFolderIdCache = id;
  return id;
}

async function getNotesAudioFolderId(token) {
  if (notesAudioFolderIdCache) return notesAudioFolderIdCache;
  let id = await findChildFolder(token, GOOGLE_DRIVE_FOLDER_ID, NOTES_AUDIO_FOLDER_NAME);
  if (!id) id = await createChildFolder(token, GOOGLE_DRIVE_FOLDER_ID, NOTES_AUDIO_FOLDER_NAME);
  notesAudioFolderIdCache = id;
  return id;
}

async function downloadNoteAudioFile(token, fileId) {
  const safeFileId = String(fileId || "").trim();
  if (!/^[A-Za-z0-9_-]{10,}$/.test(safeFileId)) throw new Error("Invalid audio file id.");

  const metadataParams = new URLSearchParams({
    fields: "id,name,mimeType,size,parents",
    supportsAllDrives: "true"
  });
  const metadataRes = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(safeFileId)}?${metadataParams.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const metadata = await metadataRes.json().catch(() => ({}));
  if (!metadataRes.ok) throw new Error(metadata.error && metadata.error.message ? metadata.error.message : "Google Drive audio lookup failed.");

  // Sprawdzamy przynależność do folderu audio przez zapytanie o WSZYSTKIE foldery o tej
  // nazwie w całym wspólnym dysku (patrz komentarz przy findFoldersAnywhereInDrive) —
  // obejmuje to też stare notatki zagnieżdżone głębiej sprzed migracji na wspólny dysk.
  const audioFolderIds = await findFoldersAnywhereInDrive(token, GOOGLE_DRIVE_FOLDER_ID, NOTES_AUDIO_FOLDER_NAME);
  const parents = Array.isArray(metadata.parents) ? metadata.parents : [];
  if (!audioFolderIds.length || !parents.some(parentId => audioFolderIds.includes(parentId))) {
    const error = new Error("Requested file is not a panel audio note.");
    error.statusCode = 403;
    throw error;
  }

  const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(safeFileId)}?alt=media&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!contentRes.ok) {
    const json = await contentRes.json().catch(() => ({}));
    throw new Error(json.error && json.error.message ? json.error.message : "Google Drive audio download failed.");
  }
  return {
    content: Buffer.from(await contentRes.arrayBuffer()),
    name: sanitizeName(metadata.name) || "notatka-glosowa",
    mimeType: String(metadata.mimeType || "application/octet-stream")
  };
}

async function getClientOfferFolderId(token, clientName) {
  if (!clientOffersFolderIdCache) {
    clientOffersFolderIdCache = await findChildFolder(token, GOOGLE_DRIVE_FOLDER_ID, CLIENT_OFFERS_FOLDER_NAME);
    if (!clientOffersFolderIdCache) {
      clientOffersFolderIdCache = await createChildFolder(token, GOOGLE_DRIVE_FOLDER_ID, CLIENT_OFFERS_FOLDER_NAME);
    }
  }

  const safeClientName = sanitizeName(clientName) || "Klient bez nazwy";
  if (clientOfferFolderIdsCache.has(safeClientName)) return clientOfferFolderIdsCache.get(safeClientName);
  let id = await findChildFolder(token, clientOffersFolderIdCache, safeClientName);
  if (!id) id = await createChildFolder(token, clientOffersFolderIdCache, safeClientName);
  clientOfferFolderIdsCache.set(safeClientName, id);
  return id;
}

async function findClientOfferFolderId(token, clientName) {
  if (!clientOffersFolderIdCache) {
    clientOffersFolderIdCache = await findChildFolder(token, GOOGLE_DRIVE_FOLDER_ID, CLIENT_OFFERS_FOLDER_NAME);
  }
  if (!clientOffersFolderIdCache) return "";

  const safeClientName = sanitizeName(clientName) || "Klient bez nazwy";
  if (clientOfferFolderIdsCache.has(safeClientName)) return clientOfferFolderIdsCache.get(safeClientName);
  const id = await findChildFolder(token, clientOffersFolderIdCache, safeClientName);
  if (id) clientOfferFolderIdsCache.set(safeClientName, id);
  return id;
}

async function uploadDriveFile(token, payload) {
  const name = sanitizeName(payload.name) || "Dokument";
  const mimeType = String(payload.mimeType || "application/octet-stream").slice(0, 120);
  const content = decodeBase64File(payload.contentBase64);
  if (!content.length) throw new Error("Empty file.");
  if (content.length > 25 * 1024 * 1024) throw new Error("File is too large for panel upload. Upload it to Drive directly and use sync.");

  const parentId = payload.forNotePhoto
    ? await getNotesPhotosFolderId(token)
    : payload.forNoteAudio
      ? await getNotesAudioFolderId(token)
      : payload.forClientOffer
        ? await getClientOfferFolderId(token, payload.clientName)
        : GOOGLE_DRIVE_FOLDER_ID;
  const metadata = {
    name,
    mimeType,
    parents: [parentId]
  };
  const boundary = `panel_drive_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    content,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  const params = new URLSearchParams({
    uploadType: "multipart",
    fields: "id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink",
    supportsAllDrives: "true"
  });
  const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files?${params.toString()}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`
    },
    body
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error && json.error.message ? json.error.message : "Google Drive upload failed.");
  return normalizeDriveFile(json);
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (!assertConfig()) {
    return res.status(500).json({
      error: "Google Drive server configuration is missing.",
      config: driveConfigStatus()
    });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const token = await getAccessToken();
    if (req.method === "GET") {
      if (req.query && req.query.audioFileId) {
        const file = await downloadNoteAudioFile(token, req.query.audioFileId);
        res.setHeader("Content-Type", file.mimeType);
        res.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`);
        res.setHeader("Content-Length", String(file.content.length));
        return res.status(200).send(file.content);
      }
      if (req.query && req.query.clientOffersFor) {
        const folderId = await findClientOfferFolderId(token, req.query.clientOffersFor);
        if (!folderId) return res.status(200).json({ files: [] });
        const files = (await listDriveFolder(token, folderId))
          .filter(file => file.mimeType !== DRIVE_FOLDER_MIME_TYPE)
          .map(file => normalizeDriveFile({ ...file, folderPath: CLIENT_OFFERS_FOLDER_NAME }));
        return res.status(200).json({ files });
      }
      const includeClientOffers = Boolean(req.query && req.query.includeClientOffers === "1");
      return res.status(200).json({ files: await listDriveFiles(token, { includeClientOffers }) });
    }
    if (req.method === "POST") {
      const payload = parseBody(req);
      if (!payload) return res.status(400).json({ error: "Invalid JSON payload." });
      return res.status(201).json({ file: await uploadDriveFile(token, payload) });
    }
  } catch (e) {
    return res.status(e && e.statusCode ? e.statusCode : 500).json({
      error: "Google Drive operation failed.",
      message: e && e.message ? e.message : "Unknown error"
    });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
};
