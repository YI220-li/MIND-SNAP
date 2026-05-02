import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { MECH_DESIGN_SYSTEM_PROMPT } from "@/lib/ai-prompts";

const mimo = createAnthropic({
  baseURL: "https://token-plan-cn.xiaomimimo.com/anthropic/v1",
  authToken: process.env.MIMO_API_KEY,
});

export async function POST(request: Request) {
  const body = await request.json();
  const uiMessages = body.messages ?? [];

  const messages = uiMessages.map((m: { role: string; parts?: { type: string; text: string }[]; content?: string }) => ({
    role: m.role,
    content: m.parts
      ? m.parts.filter((p) => p.type === "text").map((p) => p.text).join("")
      : m.content ?? "",
  }));

  const result = streamText({
    model: mimo("mimo-v2-pro"),
    system: MECH_DESIGN_SYSTEM_PROMPT,
    messages,
  });

  return result.toUIMessageStreamResponse();
}
