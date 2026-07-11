import { puter } from "@heyputer/puter.js";

const MODEL = "openai/gpt-5.3-codex";

export async function askAI(prompt: string) {
  const response = await puter.ai.chat(prompt, {
    model: MODEL,
  });

  return response;
}