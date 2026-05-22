import { requireUser } from "../_lib/auth.js";
import { badRequest, json, readJson } from "../_lib/http.js";

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export const buildResumeHtml = (metadata = {}) => {
  const list = (value) =>
    String(value || "")
      .split(/[、,\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join("");

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(metadata.lessonConcept || "レッスンレジュメ")}</title>
    <style>
      body { color: #76685d; font-family: "Hiragino Mincho ProN", "Yu Mincho", serif; line-height: 1.8; margin: 48px; }
      h1 { color: #847365; font-size: 30px; letter-spacing: .08em; }
      h2 { border-bottom: 1px solid #d9d1ca; color: #847365; font-size: 18px; margin-top: 32px; padding-bottom: 8px; }
      .colors { display: flex; gap: 8px; margin-top: 12px; }
      .swatch { width: 54px; height: 54px; border: 1px solid #d9d1ca; }
      .note { background: #fbf7f6; padding: 16px; }
      @media print { body { margin: 24mm; } }
    </style>
  </head>
  <body>
    <p>${escapeHtml(metadata.businessName || "")}</p>
    <h1>${escapeHtml(metadata.lessonConcept || "レッスンレジュメ")}</h1>
    <section>
      <h2>レッスンコンセプト</h2>
      <p class="note">${escapeHtml(metadata.lessonConcept || "")}</p>
    </section>
    <section>
      <h2>使用技術</h2>
      <ul>${list(metadata.techniques)}</ul>
    </section>
    <section>
      <h2>使用材料</h2>
      <ul>${list(metadata.materials)}</ul>
    </section>
    <section>
      <h2>モチーフ</h2>
      <ul>${list(metadata.motifs)}</ul>
    </section>
    <section>
      <h2>カラー</h2>
      <div class="colors">${(metadata.colors || [])
        .map((color) => `<span class="swatch" style="background:${escapeHtml(color)}"></span>`)
        .join("")}</div>
    </section>
    <section>
      <h2>募集時の訴求メモ</h2>
      <p>${escapeHtml(metadata.appealMemo || "完成作品の美しさ、学べる技術、贈るシーン、初心者でも安心できる導線を伝える。")}</p>
    </section>
  </body>
</html>`;
};

export const onRequestPost = async ({ request, env }) => {
  const auth = await requireUser(env, request);
  if (auth.response) return auth.response;

  const body = await readJson(request);
  if (!body.metadata) return badRequest("レジュメに使う情報がありません。");

  return json({ resumeHtml: buildResumeHtml(body.metadata) });
};
