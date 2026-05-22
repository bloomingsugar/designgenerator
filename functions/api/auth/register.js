import { createSession, hashPassword, sessionCookie } from "../../_lib/auth.js";
import { badRequest, json, readJson, serverError } from "../../_lib/http.js";

export const onRequestPost = async ({ request, env }) => {
  const body = await readJson(request);
  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim();
  const password = String(body.password || "");

  if (!email.includes("@")) return badRequest("メールアドレスを入力してください。");
  if (!name) return badRequest("お名前を入力してください。");
  if (password.length < 8) return badRequest("パスワードは8文字以上にしてください。");

  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) return badRequest("このメールアドレスは登録済みです。");

  const passwordResult = await hashPassword(password);

  try {
    const result = await env.DB.prepare(
      "INSERT INTO users (email, name, password_hash, password_salt) VALUES (?, ?, ?, ?)",
    )
      .bind(email, name, passwordResult.hash, passwordResult.salt)
      .run();

    const session = await createSession(env, result.meta.last_row_id);
    return json(
      { user: { id: result.meta.last_row_id, email, name } },
      { headers: { "set-cookie": sessionCookie(session.token, session.expiresAt) } },
    );
  } catch (error) {
    return serverError(error.message);
  }
};
