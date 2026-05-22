export const json = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers || {}),
    },
  });

export const badRequest = (message) => json({ error: message }, { status: 400 });

export const unauthorized = () => json({ error: "ログインが必要です。" }, { status: 401 });

export const serverError = (message = "サーバーで問題が起きました。") =>
  json({ error: message }, { status: 500 });

export const readJson = async (request) => {
  try {
    return await request.json();
  } catch {
    return {};
  }
};
