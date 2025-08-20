import { createSandbox } from "@/app/sandbox-map";

export async function POST(req: Request) {
    const [sandboxId, _sandbox] = await createSandbox();
    return new Response(sandboxId);
}
