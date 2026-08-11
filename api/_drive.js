// Minimalny, izolowany moduł do wgrywania plików na Google Drive - używany przez
// api/mail-sync.js (załączniki z maili). Celowo NIE dzieli kodu z api/drive-documents.js:
// ten plik miał dziś kilka delikatnych poprawek (rozpoznawanie folderu notatek głosowych),
// więc zamiast go refaktoryzować i ryzykować regresję, ta sama, sprawdzona logika
// (JWT service accounta, multipart upload) jest tu powielona w mniejszym zakresie.
const crypto = require("crypto");

const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
const GOOGLE_DRIVE_FOLDER_ID = "0ACFzxkUrgaMkUk9PVA"; // ten sam wspólny dysk co api/drive-documents.js
const DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const MAIL_ATTACHMENTS_FOLDER_NAME = "Załączniki z maili";

function hasDriveConfig() {
  return Boolean(GOOGLE_SERVICE_ACCOUNT_EMAIL && GOOGLE_PRIVATE_KEY);
}

function base64url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function signJwt(payload) {
  const header = { alg: "RS256", typ: "JWT" };
  const data = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const key = GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");
  const signature = crypto.createSign("RSA-SHA256").update(data).sign(key);
  return `${data}.${base64url(signature)}`;
}

let tokenCache = { token: "", expiresAt: 0 };
async function getDriveAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache.token && tokenCache.expiresAt - 60 > now) return tokenCache.token;

  const jwt = signJwt({
    iss: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: "https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error_description || json.error || "Google Drive token request failed.");

  tokenCache = { token: json.access_token, expiresAt: now + Number(json.expires_in || 3600) };
  return json.access_token;
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

let mailAttachmentsFolderIdCache = "";
async function getMailAttachmentsFolderId(token) {
  if (mailAttachmentsFolderIdCache) return mailAttachmentsFolderIdCache;
  let id = await findChildFolder(token, GOOGLE_DRIVE_FOLDER_ID, MAIL_ATTACHMENTS_FOLDER_NAME);
  if (!id) id = await createChildFolder(token, GOOGLE_DRIVE_FOLDER_ID, MAIL_ATTACHMENTS_FOLDER_NAME);
  mailAttachmentsFolderIdCache = id;
  return id;
}

function sanitizeName(value) {
  return String(value || "").trim().replace(/[\\/:*?"<>|]/g, "_").slice(0, 180) || "zalacznik";
}

async function uploadBufferToDrive(token, { name, mimeType, buffer, parentId }) {
  const safeName = sanitizeName(name);
  const boundary = `mail_att_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const metadata = { name: safeName, mimeType: mimeType || "application/octet-stream", parents: [parentId] };
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: ${metadata.mimeType}\r\n\r\n`),
    buffer,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);
  const params = new URLSearchParams({
    uploadType: "multipart",
    fields: "id,name,mimeType,webViewLink,webContentLink",
    supportsAllDrives: "true"
  });
  const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files?${params.toString()}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` },
    body
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error && json.error.message ? json.error.message : "Google Drive attachment upload failed.");
  return {
    id: json.id,
    name: json.name || safeName,
    link: json.webViewLink || (json.id ? `https://drive.google.com/file/d/${json.id}/view` : "")
  };
}

module.exports = {
  hasDriveConfig,
  getDriveAccessToken,
  getMailAttachmentsFolderId,
  uploadBufferToDrive
};
