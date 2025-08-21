"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Check, Copy, RefreshCw, User } from "lucide-react";

export default function Chat({ sandboxId }: { sandboxId: string }) {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      headers: {
        "x-sandbox-id": sandboxId,
      },
    }),
  });
  const isDisabled = status === "submitted" || status === "streaming";

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

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
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto pb-20 bg-zinc-50 dark:bg-zinc-950"
        >
          <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-4">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Sandbox ID: {sandboxId}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Welcome message */}
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                  AI Assistant
                </div>
                <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 shadow-sm border border-zinc-200 dark:border-zinc-800">
                  <p className="text-sm">
                    Hello! What app do you want to build today?
                  </p>
                </div>
              </div>
            </div>

            {/* Message history */}
            {messages.map((message) => (
              <div key={message.id} className="flex gap-3">
                <div className="flex-shrink-0">
                  {message.role === "user"
                    ? (
                      <div className="w-8 h-8 rounded-full bg-zinc-700 dark:bg-zinc-600 flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )
                    : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                    )}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                    {message.role === "user" ? "You" : "AI Assistant"}
                  </div>
                  <div
                    className={`rounded-lg p-4 shadow-sm border ${
                      message.role === "user"
                        ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    {message.parts.map((part, i) => {
                      switch (part.type) {
                        case "text":
                          return (
                            <div
                              key={`${message.id}-${i}`}
                              className="text-sm whitespace-pre-wrap"
                            >
                              {part.text}
                            </div>
                          );
                        default:
                          return (
                            <pre
                              key={`${message.id}-${i}`}
                              className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-pre-wrap mt-2 p-2 bg-zinc-50 dark:bg-zinc-950 rounded border border-zinc-200 dark:border-zinc-800"
                            >
                              {JSON.stringify(part, null, 2)}
                            </pre>
                          );
                      }
                    })}
                  </div>
                </div>
              </div>
            ))}

            {error && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8" />
                <div className="flex-1 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {error.message}
                  </p>
                </div>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
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
