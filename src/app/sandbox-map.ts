import { Sandbox } from "@deno/sandbox";

const sandboxMap = new Map<string, Sandbox>();

export function getSandbox(sandboxId: string): Sandbox | null {
  return sandboxMap.get(sandboxId) ?? null;
}

export function listSandboxes(): string[] {
  return Array.from(sandboxMap.keys());
}

export async function createSandbox(): Promise<[string, Sandbox]> {
  const sandboxId = crypto.randomUUID();
  console.log(`Creating sandbox ${sandboxId}`);
  const sandbox = await Sandbox.create();
  console.log(`Created sandbox ${sandboxId}`);
  sandboxMap.set(sandboxId, sandbox);
  return [sandboxId, sandbox];
}

export async function deleteSandbox(sandboxId: string): Promise<void> {
  const sandbox = sandboxMap.get(sandboxId);
  if (!sandbox) {
    return;
  }
  await sandbox.close();
  sandboxMap.delete(sandboxId);
}
