import { anthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  UIMessage,
} from "ai";
import { z } from "zod";
import { getSandbox, listSandboxes } from "@/app/sandbox-map";

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
    const availableSandboxes = listSandboxes();
    console.log(`Available sandboxes: ${availableSandboxes.join(", ")}`);
    return new Response("Sandbox not found", { status: 404 });
  }

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(10),
    system: `You are a professional and skillful code generator.
Your task is to generate JavaScript/TypeScript code based on the user's request that will be executed in a sandboxed Deno environment. A sandbox is basically a micro Linux VM with filesystem, network, and other things available.

The workflow is as follows:
1. Write files to the sandboxed Deno environment
2. Execute shell commands to do pre-processing, installing dependencies, etc. if needed
3. Spawn a Deno process that is supposed to start a HTTP server
4. Expose the HTTP server so that it gets public URL
`,
    tools: {
      sandboxWriteTextFiles: tool({
        description: "Write files to the sandboxed Deno environment",
        inputSchema: z.object({
          files: z.array(z.object({
            path: z.string().describe(
              "The path to the file to write. Should not start with a slash (in other words, it should be a relative path).",
            ),
            content: z.string().describe(
              "The text content to write to the file",
            ),
          })),
        }),
        execute: async ({ files }) => {
          await Promise.all(
            files.map(({ path, content }) =>
              sandbox.writeTextFile(path, content)
            ),
          );
          return { success: true };
        },
      }),
      sandboxExecShellCommand: tool({
        description:
          "Execute a shell command in the sandboxed Deno environment",
        inputSchema: z.object({
          command: z.string().describe("The shell command to execute"),
        }),
        execute: async ({ command }) => {
          const cmd = await sandbox.sh(command, {
            stdout: "piped",
            stderr: "piped",
          });
          const { status, stdout, stderr } = await cmd.output();
          const decoder = new TextDecoder();
          return {
            success: status.success,
            stdout: decoder.decode(stdout!),
            stderr: decoder.decode(stderr!),
          };
        },
      }),
      sandboxSpawnDenoProcess: tool({
        description:
          "Spawn a Deno process in the sandboxed Deno environment and expose it as a HTTP server",
        inputSchema: z.object({
          entrypoint: z.string().describe(
            "The path to the entrypoint file of the Deno process",
          ),
        }),
        execute: async ({ entrypoint }) => {
          const server = await sandbox.createJsRuntime({
            entrypoint,
          });
          const publicUrl = await sandbox.exposeHttp(server);
          return {
            success: true,
            publicUrl,
          };
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
