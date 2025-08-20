import Chat from "./Chat";
import { createSandbox } from "./sandbox-map";

export default async function Page() {
  const [sandboxId, _sandbox] = await createSandbox();
  return <Chat sandboxId={sandboxId} />;
}
