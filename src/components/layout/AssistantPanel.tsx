"use client";

import React, { useState } from "react";
import { X, Sparkles, Send, Building, FolderOpen, ChevronRight } from "lucide-react";
import { useUI } from "@/providers/UIProvider";
import { useOrg } from "@/providers/OrgProvider";

const MOCK_RESPONSE = "I'm your AIGA shell assistant. I can help you navigate the platform, surface project summaries, and coordinate across modules. Full AI capabilities connect when this platform integrates with PE.";

export function AssistantPanel() {
  const { isAssistantOpen, closeAssistant } = useUI();
  const { currentOrganization, currentProject } = useOrg();
  const [input,    setInput]    = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);

  function handleSend(text: string) {
    if (!text.trim()) return;
    setMessages((prev) => [
      ...prev,
      { role: "user",      text: text.trim() },
      { role: "assistant", text: MOCK_RESPONSE },
    ]);
    setInput("");
  }

  return (
    <>
      {/* Desktop: right slide-in */}
      <div
        className={`
          hidden md:flex flex-col fixed right-0 top-0 bottom-0 z-40
          w-[400px] bg-surface-raised border-l border-surface-border shadow-[var(--shadow-panel)]
          transition-transform duration-200 ease-in-out
          ${isAssistantOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        <AssistantContent
          orgName={currentOrganization.name}
          projectName={currentProject.name}
          messages={messages}
          input={input}
          setInput={setInput}
          onSend={handleSend}
          onClose={closeAssistant}
        />
      </div>

      {/* Mobile: bottom sheet */}
      <div
        className={`
          md:hidden fixed inset-x-0 bottom-0 z-50
          h-[70vh] bg-surface-raised border-t border-surface-border rounded-t-[var(--radius-card)] shadow-[var(--shadow-panel)]
          flex flex-col
          transition-transform duration-200 ease-in-out
          ${isAssistantOpen ? "translate-y-0" : "translate-y-full"}
        `}
      >
        <AssistantContent
          orgName={currentOrganization.name}
          projectName={currentProject.name}
          messages={messages}
          input={input}
          setInput={setInput}
          onSend={handleSend}
          onClose={closeAssistant}
        />
      </div>

      {/* Overlay (mobile only) */}
      {isAssistantOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={closeAssistant}
        />
      )}
    </>
  );
}

interface ContentProps {
  orgName:     string;
  projectName: string;
  messages:    { role: "user" | "assistant"; text: string }[];
  input:       string;
  setInput:    (v: string) => void;
  onSend:      (text: string) => void;
  onClose:     () => void;
}

function AssistantContent({ orgName, projectName, messages, input, setInput, onSend, onClose }: ContentProps) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-gold" />
          <span className="text-sm font-bold text-content-primary">AIGA Assistant</span>
        </div>
        <button onClick={onClose} className="text-content-muted hover:text-content-primary transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Context */}
      <div className="px-4 py-2.5 bg-surface-overlay border-b border-surface-border shrink-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[11px] text-content-muted">
            <Building size={11} />
            <span className="font-medium text-content-secondary">{orgName}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-content-muted">
            <FolderOpen size={11} />
            <span className="font-medium text-content-secondary">{projectName}</span>
          </div>
        </div>
      </div>

      {/* Messages / welcome */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-content-secondary leading-relaxed">
              How can I help you with <span className="text-content-primary font-semibold">{projectName}</span> today?
            </p>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-content-muted">Suggestions</p>
              {["Summarize open issues on this project", "Show crew status for today", "Latest inspection findings"].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => onSend(prompt)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-surface-overlay border border-surface-border hover:border-gold/30 hover:bg-gold/5 text-left text-sm text-content-secondary hover:text-content-primary transition-colors"
                >
                  <span>{prompt}</span>
                  <ChevronRight size={12} className="shrink-0 text-content-muted" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-[var(--radius-card)] px-3 py-2 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-gold/15 text-content-primary border border-gold/20"
                  : "bg-surface-overlay border border-surface-border text-content-secondary"
              }`}>
                {msg.text}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-surface-border shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSend(input)}
            placeholder="Ask anything…"
            className="flex-1 bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-sm text-content-primary placeholder:text-content-muted outline-none focus:border-gold/40 transition-colors"
          />
          <button
            onClick={() => onSend(input)}
            disabled={!input.trim()}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-gold hover:bg-gold-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={13} className="text-content-inverse" />
          </button>
        </div>
      </div>
    </>
  );
}
