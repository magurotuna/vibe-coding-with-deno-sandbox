import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  UIMessage,
} from "ai";
import { z } from "zod";
import { getSandbox } from "@/app/sandbox-map";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const sandboxTools = {};

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const sandboxId = req.headers.get("x-sandbox-id");
  if (!sandboxId) {
    console.error("Sandbox ID is required");
    return new Response("Sandbox ID is required", { status: 400 });
  }

  const sandbox = getSandbox(sandboxId);
  if (!sandbox) {
    console.error(`Sandbox not found: ${sandboxId}`);
    return new Response("Sandbox not found", { status: 404 });
  }

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(10),
    tools: {
      weather: tool({
        description: "Get the weather in a location (celsius)",
        inputSchema: z.object({
          location: z.string().describe("The location to get the weather for"),
        }),
        execute: async ({ location }) => {
          // Return a fake value
          const temperature = Math.round(Math.random() * (40 - (-10)) + (-10));
          return {
            location,
            temperature,
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
