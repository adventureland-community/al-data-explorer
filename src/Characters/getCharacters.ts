import axios from "axios";

const AL_PROXY_BASE = "https://al-proxy.thmsn.workers.dev";

/** Same split as gear import: CRA `/al` locally, Cloudflare worker in production. */
function charactersUrl(): string {
  const isLocal = process.env.NODE_ENV !== "production";
  return isLocal ? "/al/characters" : `${AL_PROXY_BASE}/characters`;
}

export async function getCharactersHtml(): Promise<string> {
  const response = await axios.get<string>(charactersUrl(), {
    responseType: "text",
    timeout: 60000,
  });
  return response.data;
}
