import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { ChatMessage, ServiceStatus } from "../../../../shared/types";
import { Composer } from "../../components/Composer";
import { ServiceControl } from "../../components/ServiceControl";

const initialStatus: ServiceStatus = { state: "starting", detail: "Starting local API" };
type ModelMode = "local" | "remote";

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return { id: crypto.randomUUID(), role, content };
}

export function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<ServiceStatus>(initialStatus);
  const [isSending, setIsSending] = useState(false);
  const [isManagingService, setIsManagingService] = useState(false);
  const [modelMode, setModelMode] = useState<ModelMode>("local");
  const [error, setError] = useState<string | undefined>();
  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refreshStatus = () => {
      void window.agentApi.getOllamaStatus().then(setStatus).catch(() => {
        setStatus({ state: "unavailable", detail: "Could not check Ollama." });
      });
    };

    refreshStatus();
    const interval = window.setInterval(refreshStatus, 3_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  async function manageService(action: "start" | "stop") {
    setIsManagingService(true);
    setError(undefined);
    try {
      const nextStatus = action === "start" ? await window.agentApi.startOllama() : await window.agentApi.stopOllama();
      setStatus(nextStatus);
    } catch {
      setStatus({ state: "unavailable", detail: "Could not change the Ollama state." });
    } finally {
      setIsManagingService(false);
    }
  }

  async function sendMessage() {
    const content = draft.trim();
    if (!content || isSending) {
      return;
    }

    if (modelMode === "remote") {
      setError("Remote models are not available yet.");
      return;
    }

    if (status.state !== "available") {
      setError("Turn on Ollama before sending a message.");
      return;
    }

    const userMessage = createMessage("user", content);
    setDraft("");
    setError(undefined);
    setMessages((current) => [...current, userMessage]);
    setIsSending(true);

    try {
      const result = await window.agentApi.sendChat({ message: content, history: messages });
      setMessages((current) => [...current, createMessage("assistant", result.message)]);
    } catch (caughtError) {
      setDraft(content);
      setError(caughtError instanceof Error ? caughtError.message : "The local agent could not answer.");
    } finally {
      setIsSending(false);
    }
  }

  const hasMessages = messages.length > 0;
  const composerDisabled = isSending;

  const modelControls = (
    <div className="model-controls" role="radiogroup" aria-label="Model source">
      <button
        type="button"
        role="radio"
        aria-checked={modelMode === "local"}
        className={modelMode === "local" ? "model-choice model-choice--selected" : "model-choice"}
        onClick={() => {
          setModelMode("local");
          setError(undefined);
        }}
      >
        Local
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={modelMode === "remote"}
        className={modelMode === "remote" ? "model-choice model-choice--selected" : "model-choice"}
        onClick={() => {
          setModelMode("remote");
          setError(undefined);
        }}
      >
        Remote
      </button>
    </div>
  );

  return (
    <main className={hasMessages ? "chat-screen chat-screen--active" : "chat-screen chat-screen--empty"}>
      <header className="topbar">
        <nav className="app-menu" aria-label="Application menu">
          <button type="button" onClick={() => window.agentApi.showAppMenu("file")}>File</button>
          <button type="button" onClick={() => window.agentApi.showAppMenu("edit")}>Edit</button>
          <button type="button" onClick={() => window.agentApi.showAppMenu("view")}>View</button>
          <button type="button" onClick={() => window.agentApi.showAppMenu("help")}>Help</button>
        </nav>
        <ServiceControl
          status={status}
          disabled={isManagingService}
          onStart={() => void manageService("start")}
          onStop={() => void manageService("stop")}
        />
      </header>

      <div className="chat-surface">
        {hasMessages ? (
          <section className="conversation" aria-label="Conversation">
            <div className="message-list">
              {messages.map((message) => (
                <article key={message.id} className={`message message--${message.role}`}>
                  {message.role === "assistant" ? (
                    <div className="markdown-message">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </article>
              ))}
              {isSending ? <p className="replying">Local agent is thinking</p> : null}
              <div ref={messageEndRef} />
            </div>
            {error ? <p className="error-message">{error}</p> : null}
            <Composer value={draft} disabled={composerDisabled} onChange={setDraft} onSubmit={() => void sendMessage()} />
            {modelControls}
          </section>
        ) : (
          <section className="welcome" aria-label="Start a conversation">
            <h1>Type anything to begin.</h1>
            {error ? <p className="error-message">{error}</p> : null}
            <Composer value={draft} disabled={composerDisabled} onChange={setDraft} onSubmit={() => void sendMessage()} />
            {modelControls}
          </section>
        )}
      </div>
    </main>
  );
}
