import { Sandbox } from "@deno/sandbox";

const sandboxMap = new Map<string, Sandbox>();

export function getSandbox(sandboxId: string): Sandbox | null {
  return sandboxMap.get(sandboxId) ?? null;
}

export async function createSandbox(): Promise<[string, Sandbox]> {
  const sandboxId = crypto.randomUUID();
  const sandbox = await Sandbox.create();
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
