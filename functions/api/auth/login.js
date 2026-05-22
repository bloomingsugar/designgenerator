import { createSession, sessionCookie, verifyPassword } from "../../_lib/auth.js";
import { badRequest, json, readJson } from "../../_lib/http.js";

export const onRequestPost = async ({ request, env }) => {
  const body = await readJson(request);
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  if (!user) return badRequest("メールアドレスまたはパスワードが違います。");

  const ok = await verifyPassword(password, user.password_salt, user.password_hash);
  if (!ok) return badRequest("メールアドレスまたはパスワードが違います。");

  const session = await createSession(env, user.id);
  return json(
    { user: { id: user.id, email: user.email, name: user.name } },
    { headers: { "set-cookie": sessionCookie(session.token, session.expiresAt) } },
  );
};
