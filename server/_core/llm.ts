/**
 * LLM — OpenAI GPT-4o-mini (standalone, sin dependencia de Manus)
 */
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function invokeLLM(params: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  response_format?: { type: "json_schema"; json_schema: object };
}) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: params.messages,
    response_format: params.response_format as any,
    max_tokens: 4096,
  });
  return response;
}
