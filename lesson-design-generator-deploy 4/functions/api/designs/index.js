import { requireUser } from "../../_lib/auth.js";
import { badRequest, json, readJson } from "../../_lib/http.js";

const serializeDesign = (row) => ({
  id: row.id,
  title: row.title,
  prompt: row.prompt,
  imageData: row.image_data,
  resumeHtml: row.resume_html,
  metadata: JSON.parse(row.metadata || "{}"),
  createdAt: row.created_at,
});

export const onRequestGet = async ({ request, env }) => {
  const auth = await requireUser(env, request);
  if (auth.response) return auth.response;

  const rows = await env.DB.prepare(
    "SELECT * FROM designs WHERE user_id = ? ORDER BY datetime(created_at) DESC LIMIT 100",
  )
    .bind(auth.user.id)
    .all();

  return json({ designs: rows.results.map(serializeDesign) });
};

export const onRequestPost = async ({ request, env }) => {
  const auth = await requireUser(env, request);
  if (auth.response) return auth.response;

  const body = await readJson(request);
  const title = String(body.title || body.metadata?.lessonConcept || "レッスンデザイン").trim();
  const prompt = String(body.prompt || "").trim();

  if (!prompt) return badRequest("保存するプロンプトがありません。");

  const result = await env.DB.prepare(
    `INSERT INTO designs (user_id, title, prompt, image_data, resume_html, metadata)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      auth.user.id,
      title,
      prompt,
      body.imageData || null,
      body.resumeHtml || null,
      JSON.stringify(body.metadata || {}),
    )
    .run();

  const row = await env.DB.prepare("SELECT * FROM designs WHERE id = ? AND user_id = ?")
    .bind(result.meta.last_row_id, auth.user.id)
    .first();

  return json({ design: serializeDesign(row) });
};
