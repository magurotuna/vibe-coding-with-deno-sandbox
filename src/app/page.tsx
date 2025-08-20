import Chat from "./Chat";
import { headers } from "next/headers";

export default async function Page() {
  const hdr = await headers();
  const host = hdr.get("host");
  const proto = hdr.get("x-forwarded-proto") || "http";
  const baseUrl = `${proto}://${host}`;
  const response = await fetch(`${baseUrl}/api/sandbox`, {
    method: "POST",
  });
  const sandboxId = await response.text();
  return <Chat sandboxId={sandboxId} />;
}
