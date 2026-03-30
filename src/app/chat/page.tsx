"use client";

import React, { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import type { FileSearchStore, ChatMessage } from "@/types/gemini";
import { Streamdown } from "streamdown";

export default function ChatPage() {
  const { t } = useI18n();
  const { error } = useToast();

  const [stores, setStores] = useState<FileSearchStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [loadingStores, setLoadingStores] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [metadataFilter, setMetadataFilter] = useState("");
  const availableModelsEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_AVAILABLE_MODELS
      : undefined;
  const defaultModelEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_DEFAULT_MODEL
      : undefined;
  const availableModels = availableModelsEnv
    ? availableModelsEnv
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean)
    : ["gemini-2.5-flash", "gemini-1.0"];

  const [selectedModel, setSelectedModel] = useState(defaultModelEnv || "");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadStores() {
      try {
        const res = await fetch("/api/stores");
        const json = await res.json();
        if (json.success && json.data.length > 0) {
          setStores(json.data);
          setSelectedStore(json.data[0].name.split("/").pop() || "");
        }
      } catch (err) {
        error(t("common.error"));
      } finally {
        setLoadingStores(false);
      }
    }
    loadStores();
  }, [t, error]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || !selectedStore || isTyping) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now().toString(),
      role: "user",
      content: inputValue,
    };
    const history = [...messages];
    setMessages([...history, userMsg]);
    setInputValue("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMsg.content,
          history: history,
          storeId: selectedStore,
          metadataFilter: metadataFilter.trim() || undefined,
          model: selectedModel || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      if (!reader) {
        throw new Error("No reader available");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          timestamp: Date.now().toString(),
          role: "assistant",
          content: "",
        },
      ]);

      let done = false;
      let modelContent = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.replace("data: ", "").trim();
              if (dataStr === "[DONE]") {
                done = true;
                break;
              }
              try {
                const data = JSON.parse(dataStr);

                // Currently ignoring citations in this simple implementation

                if (data.text) {
                  modelContent += data.text;
                  setMessages((prev) => {
                    const newMsgs = [...prev];
                    const last = newMsgs[newMsgs.length - 1];
                    if (last.role === "assistant") {
                      last.content = modelContent;
                    }
                    return newMsgs;
                  });
                } else if (data.error) {
                  error(data.error);
                  break;
                }
              } catch (e) {
                // Ignore incomplete JSON chunks, highly possible in SSE
                // But normally we send full JSON objects per line
              }
            }
          }
        }
      }
    } catch (err) {
      error(t("common.error"));
    } finally {
      setIsTyping(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  return (
    <div className="chat-page">
      <div className="chat-layout">
        <div className="chat-main">
          <Card className="chat-container">
            <div className="chat-header">
              <h2>{t("chat.title")}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={messages.length === 0 || isTyping}
              >
                {t("chat.clearHistory")}
              </Button>
            </div>

            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="chat-welcome">
                  <div className="icon">🤖</div>
                  <p>{t("chat.welcome")}</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`message-wrapper ${msg.role}`}>
                    <div className="message-bubble">
                      {msg.role === "user" ? (
                        <div className="user-content">{msg.content}</div>
                      ) : (
                        <div className="markdown-content">
                          <Streamdown>{msg.content}</Streamdown>
                          {msg.content === "" && isTyping && (
                            <span className="typing-indicator">
                              {t("chat.thinking")}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
              <textarea
                className="chat-textarea"
                placeholder={t("chat.placeholder")}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={isTyping || !selectedStore}
              />
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || !selectedStore || isTyping}
                isLoading={isTyping}
                className="send-button"
              >
                {t("chat.send")}
              </Button>
            </div>
          </Card>
        </div>

        <div className="chat-sidebar">
          <Card>
            <div className="config-section">
              <h3>{t("chat.selectStore")}</h3>
              {loadingStores ? (
                <div className="loading-sm">{t("common.loading")}</div>
              ) : stores.length === 0 ? (
                <div className="empty-sm">{t("stores.empty")}</div>
              ) : (
                <select
                  className="store-select"
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  disabled={isTyping}
                >
                  {stores.map((store) => {
                    const id = store.name.split("/").pop();
                    return (
                      <option key={id} value={id}>
                        {store.displayName || id}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            <div className="config-section mt">
              <h3>{t("chat.selectModel")}</h3>
              <select
                className="store-select"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={isTyping}
              >
                <option value="">Use default model</option>
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <p className="help-text">
                Select which model to use for this chat.
              </p>
            </div>

            <div className="config-section mt">
              <h3>{t("chat.filter")}</h3>
              <Input
                placeholder={t("chat.filterPlaceholder")}
                value={metadataFilter}
                onChange={(e) => setMetadataFilter(e.target.value)}
                disabled={isTyping || !selectedStore}
              />
              <p className="help-text">
                Used to filter documents via custom metadata. E.g.{" "}
                {"author='John'"}
              </p>
            </div>
          </Card>
        </div>
      </div>

      <style jsx>{`
        .chat-page {
          height: calc(100vh - var(--navbar-height) - var(--spacing-2xl));
          min-height: 600px;
        }

        .chat-layout {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: var(--spacing-xl);
          height: 100%;
        }

        .chat-main {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .chat-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 0;
          overflow: hidden;
          background-color: var(--bg-cell);
        }

        .chat-header {
          padding: var(--spacing-lg) var(--spacing-xl);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .chat-header h2 {
          font-size: var(--font-size-body);
          font-weight: var(--font-weight-bold);
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: var(--spacing-xl);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .chat-welcome {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          opacity: 0.8;
        }

        .chat-welcome .icon {
          font-size: 48px;
          margin-bottom: var(--spacing-md);
        }

        .message-wrapper {
          display: flex;
          width: 100%;
        }

        .message-wrapper.user {
          justify-content: flex-end;
        }

        .message-wrapper.model {
          justify-content: flex-start;
        }

        .message-bubble {
          max-width: 80%;
          padding: var(--spacing-md) var(--spacing-lg);
          border-radius: var(--radius-card);
          line-height: 1.6;
        }

        .user .message-bubble {
          background-color: var(--primary);
          color: #fff;
          border-bottom-right-radius: 4px;
        }

        .model .message-bubble {
          background-color: var(--bg-page);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          border-bottom-left-radius: 4px;
        }

        .user-content {
          white-space: pre-wrap;
        }

        .markdown-content :global(p) {
          margin-bottom: 0.5em;
        }
        .markdown-content :global(p:last-child) {
          margin-bottom: 0;
        }
        .markdown-content :global(pre) {
          background-color: rgba(0, 0, 0, 0.05);
          padding: 1em;
          border-radius: 8px;
          overflow-x: auto;
          margin: 0.5em 0;
        }

        .typing-indicator {
          color: var(--text-tertiary);
          font-style: italic;
          font-size: var(--font-size-small);
        }

        .chat-input-area {
          padding: var(--spacing-lg);
          border-top: 1px solid var(--border-color);
          display: flex;
          gap: var(--spacing-md);
          background-color: var(--bg-cell);
        }

        .chat-textarea {
          flex: 1;
          min-height: 60px;
          max-height: 200px;
          padding: var(--spacing-md);
          border-radius: var(--radius-card);
          border: 1px solid var(--border-color-strong);
          background-color: var(--bg-page);
          color: var(--text-primary);
          font-family: inherit;
          font-size: var(--font-size-body);
          resize: none;
          transition: border-color var(--transition-fast);
        }

        .chat-textarea:focus {
          outline: none;
          border-color: var(--primary);
        }

        .chat-textarea:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .send-button {
          height: auto;
          padding: 0 var(--spacing-xl);
          align-self: stretch;
        }

        .chat-sidebar {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xl);
        }

        .config-section h3 {
          font-size: var(--font-size-caption);
          color: var(--text-secondary);
          margin-bottom: var(--spacing-sm);
        }

        .store-select {
          width: 100%;
          height: var(--input-height);
          padding: 0 var(--spacing-md);
          border-radius: var(--radius-input);
          border: 1px solid var(--border-color-strong);
          background-color: var(--bg-cell);
          color: var(--text-primary);
          font-size: var(--font-size-body);
        }

        .store-select:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .help-text {
          font-size: var(--font-size-small);
          color: var(--text-tertiary);
          margin-top: var(--spacing-xs);
        }

        .mt {
          margin-top: var(--spacing-xl);
        }

        @media (max-width: 900px) {
          .chat-layout {
            grid-template-columns: 1fr;
          }
          .chat-page {
            height: auto;
            min-height: auto;
          }
          .chat-container {
            height: 600px;
          }
        }
      `}</style>
    </div>
  );
}
