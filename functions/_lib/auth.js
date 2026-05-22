import { unauthorized } from "./http.js";

const encoder = new TextEncoder();

const toBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));

const fromBase64 = (text) => {
  const normalized = text.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
};

const randomToken = (length = 32) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return toBase64(bytes.buffer).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

export const hashPassword = async (password, salt = randomToken(16)) => {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: fromBase64(salt),
      iterations: 100000,
    },
    key,
    256,
  );

  return {
    salt,
    hash: toBase64(bits),
  };
};

export const verifyPassword = async (password, salt, hash) => {
  const result = await hashPassword(password, salt);
  return result.hash === hash;
};

export const createSession = async (env, userId) => {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  await env.DB.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(token, userId, expiresAt)
    .run();
  return { token, expiresAt };
};

export const sessionCookie = (token, expiresAt) =>
  `session=${token}; Path=/; HttpOnly; SameSite=Lax; Secure; Expires=${new Date(expiresAt).toUTCString()}`;

export const clearSessionCookie = "session=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0";

const getCookie = (request, name) => {
  const cookie = request.headers.get("cookie") || "";
  return cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
};

export const getCurrentUser = async (env, request) => {
  const token = getCookie(request, "session");
  if (!token) return null;

  const row = await env.DB.prepare(
    `SELECT users.id, users.email, users.name
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token = ? AND sessions.expires_at > datetime('now')`,
  )
    .bind(token)
    .first();

  return row || null;
};

export const requireUser = async (env, request) => {
  const user = await getCurrentUser(env, request);
  if (!user) return { response: unauthorized() };
  return { user };
};
