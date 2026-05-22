import { requireUser } from "../_lib/auth.js";
import { badRequest, json, readJson, serverError } from "../_lib/http.js";

const sizeFromRatio = (ratio) => {
  if (ratio === "9:16") return "1024x1536";
  if (ratio === "16:9") return "1536x1024";
  return "1024x1024";
};

export const onRequestPost = async ({ request, env }) => {
  const auth = await requireUser(env, request);
  if (auth.response) return auth.response;

  if (!env.OPENAI_API_KEY) {
    return serverError("OPENAI_API_KEY がCloudflare Pagesに設定されていません。");
  }

  const body = await readJson(request);
  const prompt = String(body.prompt || "").trim();
  if (!prompt) return badRequest("画像生成用のプロンプトがありません。");

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_IMAGE_MODEL || "gpt-image-1.5",
      prompt,
      size: sizeFromRatio(body.ratio),
      n: 1,
    }),
  });

  const result = await response.json();
  if (!response.ok) {
    return json({ error: result.error?.message || "画像生成に失敗しました。" }, { status: response.status });
  }

  const item = result.data?.[0] || {};
  const imageData = item.b64_json ? `data:image/png;base64,${item.b64_json}` : item.url;
  if (!imageData) return serverError("画像データを取得できませんでした。");

  return json({ imageData });
};
