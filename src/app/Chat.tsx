"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";

export default function Chat({ sandboxId }: { sandboxId: string }) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      headers: {
        "x-sandbox-id": sandboxId,
      },
    }),
  });
  const isDisabled = status === "submitted" || status === "streaming";

  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      <div className="text-sm text-gray-500 mb-4">
        Sandbox ID: {sandboxId}
      </div>
      <div className="whitespace-pre-wrap">
        AI:{" "}
        <div>
          Hello! What app do you want to build today?
        </div>
      </div>
      {messages.map((message) => (
        <div key={message.id} className="whitespace-pre-wrap">
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
        <div className="text-red-500 text-sm">
          {error.message}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isDisabled) {
            sendMessage({ text: input });
            setInput("");
          }
        }}
      >
        <input
          className="fixed dark:bg-zinc-900 bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 dark:border-zinc-800 rounded shadow-xl"
          value={input}
          placeholder={isDisabled
            ? "Waiting for the AI to respond..."
            : "Say something..."}
          onChange={(e) => setInput(e.currentTarget.value)}
          disabled={isDisabled}
        />
      </form>
    </div>
  );
}
