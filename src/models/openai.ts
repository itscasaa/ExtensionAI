export const MIMO_API_URL = "https://casaaraksa.duckdns.org/v1";

export interface GptApiRequest {
  model: string;
  messages: GptMessage[];
  temperature: number;
}

export interface GptMessage {
  role: string;
  content: string;
}

export interface GptApiResponse {
  choices: GptChoice[];
}

export interface GptChoice {
  message: GptMessage;
}

export enum GptModel {
  MIMO_V2_5_PRO = "mimo/mimo-v2.5-pro"
}

export function getEndpoints(configuredUrl: string) {
  let base = configuredUrl ? configuredUrl.trim() : "";
  if (!base) {
    base = "https://casaaraksa.duckdns.org/v1";
  }
  // Remove trailing slash if present
  if (base.endsWith("/")) {
    base = base.slice(0, -1);
  }
  // If user configured the full completions URL, strip it to get the base
  if (base.endsWith("/chat/completions")) {
    base = base.substring(0, base.length - "/chat/completions".length);
  }
  return {
    base: base,
    chat: `${base}/chat/completions`,
    models: `${base}/models`
  };
}
