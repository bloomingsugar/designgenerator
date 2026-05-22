import { clearSessionCookie } from "../../_lib/auth.js";
import { json } from "../../_lib/http.js";

export const onRequestPost = async ({ request, env }) => {
  const token = (request.headers.get("cookie") || "")
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("session="))
    ?.split("=")
    .slice(1)
    .join("=");

  if (token) {
    await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  }

  return json({ ok: true }, { headers: { "set-cookie": clearSessionCookie } });
};
