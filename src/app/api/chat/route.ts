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
import type { JsRuntime } from "@deno/sandbox";
import { toText } from "@std/streams/to-text";

const runtimes = new Map<number, JsRuntime>();

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
    onError: (error) => {
      console.error("Error", error);
    },
    system: `You are a professional and skillful code generator.
Your task is to generate JavaScript/TypeScript code based on the user's request that will be executed in a sandboxed Deno environment. A sandbox is basically a micro Linux VM with filesystem, network, and other things available.

The workflow is as follows:
1. Write files to the sandboxed Deno environment
2. Execute shell commands to do pre-processing, installing dependencies, etc. if needed
3. Spawn a Deno process that is supposed to start a HTTP server
4. Expose the HTTP server so that it gets public URL

For dynamic apps that require some server-side processing, 'Deno.serve' or 'node:http' should be used to start a HTTP server. For static apps that only need to serve static files from the filesystem, 'jsr:@std/http/file-server' can be used for easy setucan be used for easy setup`,
    tools: {
      sandboxWriteTextFile: tool({
        description: "Write a text file to the sandboxed Deno environment",
        inputSchema: z.object({
          path: z.string().describe(
            "The path to the file to write. Should not start with a slash (in other words, it should be a relative path).",
          ),
          content: z.string().describe("The text content to write to the file"),
        }),
        execute: async ({ path, content }) => {
          await sandbox.writeTextFile(path, content);
          return { success: true };
        },
      }),
      sandboxReadTextFile: tool({
        description: "Read a text file from the sandboxed Deno environment",
        inputSchema: z.object({
          path: z.string().describe("The path to the file to read"),
        }),
        execute: async ({ path }) => {
          const content = await sandbox.readTextFile(path);
          return { success: true, content };
        },
      }),
      sandboxExecShellCommand: tool({
        description:
          "Execute a shell command in the sandboxed Deno environment. This awaits until the command completes. Must not be used for long-running commands.",
        inputSchema: z.object({
          command: z.string().describe("The shell command to execute"),
          timeoutMs: z.number().positive().max(10_000).optional().describe(
            "The timeout in milliseconds for the command to complete. If not specified, the command will time out in 5 seconds.",
          ),
        }),
        execute: async ({ command, timeoutMs }) => {
          const cmd = await sandbox.sh(command, {
            stdout: "piped",
            stderr: "piped",
          });

          const { status, stdout, stderr } = await Promise.race([
            cmd.output(),
            new Promise<never>((_, reject) => {
              setTimeout(() => {
                cmd.kill();
                reject(new Error("Command timed out"));
              }, timeoutMs ?? 5_000);
            }),
          ]);

          const decoder = new TextDecoder();
          return {
            success: status.success,
            stdout: decoder.decode(stdout!),
            stderr: decoder.decode(stderr!),
          };
        },
      }),
      sandboxSpawnDenoProcess: tool({
        description: "Spawn a Deno process in the sandboxed Deno environment",
        inputSchema: z.object({
          entrypoint: z.string().describe(
            "The path or URL to the entrypoint of the Deno process. It can be an external URL, e.g. `jsr:@std/http/file-server`",
          ),
        }),
        execute: async ({ entrypoint }) => {
          const runtime = await sandbox.createJsRuntime({
            entrypoint,
            stdout: "piped",
            stderr: "piped",
          });
          runtimes.set(runtime.pid, runtime);
          return {
            success: true,
            pid: runtime.pid,
          };
        },
      }),
      sandboxKillDenoProcess: tool({
        description:
          "Kill a Deno process running in the sandboxed Deno environment",
        inputSchema: z.object({
          pid: z.number().describe("The PID of the Deno process to kill"),
        }),
        execute: async ({ pid }) => {
          const runtime = runtimes.get(pid);
          if (!runtime) {
            throw new Error(`JS runtime with PID ${pid} not found`);
          }
          await runtime.kill();
          runtimes.delete(pid);
          return { success: true };
        },
      }),
      sandboxExposeHttp: tool({
        description:
          "Expose a HTTP server running in the sandboxed Deno environment to the public internet by attaching a public URL. ",
        inputSchema: z.object({
          pid: z.number().describe(
            "The PID of the Deno process where the HTTP server to be exposed is running",
          ),
        }),
        execute: async ({ pid }) => {
          const runtime = runtimes.get(pid);
          if (!runtime) {
            throw new Error(`JS runtime with PID ${pid} not found`);
          }

          try {
            await Promise.race([
              runtime.httpReady,
              new Promise((_, reject) => {
                setTimeout(() => {
                  reject(new JsRuntimeHttpTimeoutError());
                }, 5000);
              }),
            ]);
          } catch (e) {
            if (e instanceof JsRuntimeHttpTimeoutError) {
              throw e;
            }

            await runtime.kill();
            runtimes.delete(pid);
            const stdout = await toText(runtime.stdout!);
            const stderr = await toText(runtime.stderr!);
            throw new Error(
              `Failed to expose HTTP server because the process does not run as a HTTP server. stdout: ${stdout}\nstderr: ${stderr}`,
            );
          }

          const publicUrl = await sandbox.exposeHttp(runtime);
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

class JsRuntimeHttpTimeoutError extends Error {
  constructor() {
    super("http server startup timed out");
    this.name = this.constructor.name;
  }
}
