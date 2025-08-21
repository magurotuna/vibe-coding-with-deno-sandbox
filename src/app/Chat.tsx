"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMemo, useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";

export default function Chat({ sandboxId }: { sandboxId: string }) {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      headers: {
        "x-sandbox-id": sandboxId,
      },
    }),
  });
  const isDisabled = status === "submitted" || status === "streaming";

  const publicUrl = useMemo(() => {
    for (const msg of messages.toReversed()) {
      for (const part of msg.parts.toReversed()) {
        if (
          part.type === "tool-sandboxExposeHttp" &&
          part.state === "output-available"
        ) {
          const output = part.output as { success: true; publicUrl: string };
          return output.publicUrl;
        }
      }
    }
  }, [messages]);

  return (
    <div className="flex h-screen w-full">
      {/* Chat Section */}
      <div
        className={`flex flex-col ${
          publicUrl ? "w-1/2" : "w-full max-w-2xl mx-auto"
        } h-full transition-all duration-300`}
      >
        <div className="flex-1 overflow-y-auto p-6 pb-20">
          <div className="text-sm text-gray-500 mb-4">
            Sandbox ID: {sandboxId}
          </div>
          <div className="whitespace-pre-wrap mb-4">
            AI:{" "}
            <div>
              Hello! What app do you want to build today?
            </div>
          </div>
          {messages.map((message) => (
            <div key={message.id} className="whitespace-pre-wrap mb-4">
              {message.role === "user" ? "User: " : "AI: "}
              {message.parts.map((part, i) => {
                switch (part.type) {
                  case "text":
                    return (
                      <div key={`${message.id}-${i}`}>
                        {part.text}
                      </div>
                    );
                  default:
                    return (
                      <pre
                        key={`${message.id}-${i}`}
                        className="text-xs text-gray-500 whitespace-pre-wrap"
                      >
                        {JSON.stringify(part, null, 2)}
                      </pre>
                    );
                }
              })}
            </div>
          ))}
          {error && (
            <div className="text-red-500 text-sm mb-4">
              {error.message}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!isDisabled) {
              sendMessage({ text: input });
              setInput("");
            }
          }}
          className="p-4 border-t border-zinc-200 dark:border-zinc-800"
        >
          <input
            className="w-full p-3 border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={input}
            placeholder={isDisabled
              ? "Waiting for the AI to respond..."
              : "Say something..."}
            onChange={(e) => setInput(e.currentTarget.value)}
            disabled={isDisabled}
          />
        </form>
      </div>

      {/* Iframe Section */}
      {publicUrl && (
        <div className="w-1/2 h-full border-l border-zinc-200 dark:border-zinc-800 flex flex-col">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Deployed App</span>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:text-blue-600 underline"
                >
                  {publicUrl}
                </a>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const iframe = document.getElementById(
                      "app-iframe",
                    ) as HTMLIFrameElement;
                    if (iframe) iframe.src = iframe.src;
                  }}
                  className="p-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded transition-all active:scale-95 active:bg-zinc-400 dark:active:bg-zinc-600 cursor-pointer"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(publicUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="p-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded transition-all active:scale-95 active:bg-zinc-400 dark:active:bg-zinc-600 cursor-pointer"
                  title={copied ? "Copied!" : "Copy URL"}
                >
                  {copied
                    ? (
                      <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    )
                    : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1 bg-white">
            <iframe
              id="app-iframe"
              src={publicUrl}
              className="w-full h-full"
              title="Deployed Application"
            />
          </div>
        </div>
      )}
    </div>
  );
}
