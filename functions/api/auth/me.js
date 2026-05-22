import { getCurrentUser } from "../../_lib/auth.js";
import { json } from "../../_lib/http.js";

export const onRequestGet = async ({ request, env }) => {
  const user = await getCurrentUser(env, request);
  return json({ user });
};
