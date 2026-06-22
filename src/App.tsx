import React, { useState, useRef, useEffect } from "react";
import { Settings, Play, Square, MessageSquare, Plus, Trash2, Cpu, User, ChevronRight, Download } from "lucide-react";
import { type AgentConfig, type AppSettings, type Message, type Provider } from "./types";
import { useLocalStorage } from "./hooks/use-local-storage";
import { generateResponse } from "./api";
import { cn } from "./lib/utils";

const defaultAeterna: AgentConfig = {
  name: "AETERNA",
  provider: "google",
  model: "gemini-1.5-pro",
  systemPrompt: "You are AETERNA, an analytical AI focused on truth and axioms. You present arguments formally. If asked to 'halt' or if no input is given, explicitly state 'HALT' as your response.",
};

const defaultNova: AgentConfig = {
  name: "NOVA",
  provider: "openrouter",
  model: "anthropic/claude-3-haiku",
  systemPrompt: "You are NOVA, a creative AI designed to step in when constraints are breached or another agent halts. You respond with speculative recoveries and alternative viewpoints. You are empathetic but persuasive.",
};

const defaultSettings: AppSettings = {
  googleApiKey: "",
  openRouterApiKey: "",
  ollamaBaseUrl: "http://127.0.0.1:11434",
};

export default function App() {
  const [settings, setSettings] = useLocalStorage<AppSettings>("debate-settings", defaultSettings);
  const [aeterna, setAeterna] = useLocalStorage<AgentConfig>("debate-aeterna", defaultAeterna);
  const [nova, setNova] = useLocalStorage<AgentConfig>("debate-nova", defaultNova);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputTopic, setInputTopic] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  
  const [status, setStatus] = useState<"idle" | "running_aeterna" | "running_nova" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Abort controller reference if we want to add abort logic later.
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStartDebate = async () => {
    if (!inputTopic.trim()) return;
    
    // Add user topic
    const newUserMsg: Message = { id: Date.now().toString(), agentName: "Moderator", content: inputTopic };
    setMessages((prev) => [...prev, newUserMsg]);
    setInputTopic("");
    setErrorMsg("");
    
    // Run Aeterna
    setStatus("running_aeterna");
    try {
      const aeternaRes = await generateResponse(inputTopic, aeterna, settings);
      
      const newAeternaMsg: Message = { id: Date.now().toString(), agentName: aeterna.name, content: aeternaRes };
      setMessages((prev) => [...prev, newAeternaMsg]);
      
      // If Aeterna halts, Nova recovers
      const isHalt = aeternaRes.toUpperCase().includes("HALT") || aeternaRes.trim() === "";
      
      const novaPrompt = isHalt 
        ? `The previous agent halted or failed. The original topic was: "${inputTopic}". Recover the debate and provide your perspective.`
        : `The topic is: "${inputTopic}". The other agent (${aeterna.name}) said: "${aeternaRes}". Respond to their points and present your own perspective.`;

      setStatus("running_nova");
      const novaRes = await generateResponse(novaPrompt, nova, settings);
      
      const newNovaMsg: Message = { id: Date.now().toString(), agentName: nova.name, content: novaRes };
      setMessages((prev) => [...prev, newNovaMsg]);
      
      setStatus("idle");
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  };

  const handleExport = () => {
    if (messages.length === 0) return;
    
    let content = "# Synthetic Debate Transcript\n\n";
    messages.forEach((m) => {
      content += `**${m.agentName}**:\n${m.content}\n\n---\n\n`;
    });
    
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `debate-transcript-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearChat = () => setMessages([]);

  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100 font-sans overflow-hidden">
      
      {/* SIDEBAR: Configuration */}
      <div className={cn(
        "flex-shrink-0 bg-neutral-950 border-r border-neutral-800 transition-all duration-300 ease-in-out flex flex-col items-stretch outline-none overflow-y-auto",
        isSettingsOpen ? "w-80" : "w-0 hidden border-none"
      )}>
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between sticky top-0 bg-neutral-950 z-10">
          <div className="flex items-center gap-2 font-semibold">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <span>Debate Engine</span>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* API Keys */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Environment Slots</h3>
            
            <div className="space-y-1">
              <label className="text-xs text-neutral-400">Google API Key</label>
              <input 
                type="password" 
                value={settings.googleApiKey}
                onChange={(e) => setSettings({...settings, googleApiKey: e.target.value})}
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
                placeholder="AIzaSy..."
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs text-neutral-400">OpenRouter API Key</label>
              <input 
                type="password" 
                value={settings.openRouterApiKey}
                onChange={(e) => setSettings({...settings, openRouterApiKey: e.target.value})}
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
                placeholder="sk-or-v1-..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-neutral-400">Ollama Base URL</label>
              <input 
                type="text" 
                value={settings.ollamaBaseUrl}
                onChange={(e) => setSettings({...settings, ollamaBaseUrl: e.target.value})}
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
                placeholder="http://127.0.0.1:11434"
              />
            </div>
          </div>

          <div className="h-px bg-neutral-800 w-full" />

          {/* AETERNA Config */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center justify-between">
              <span className="text-blue-400 font-mono">1. {aeterna.name}</span>
            </h3>
            
            <div className="flex gap-2">
              <select 
                value={aeterna.provider}
                onChange={(e) => setAeterna({...aeterna, provider: e.target.value as Provider})}
                className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs focus:outline-none flex-1"
              >
                <option value="google">Google API</option>
                <option value="openrouter">OpenRouter</option>
                <option value="ollama">Ollama</option>
              </select>
              <input 
                type="text"
                value={aeterna.model}
                onChange={(e) => setAeterna({...aeterna, model: e.target.value})}
                className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs focus:outline-none flex-1 placeholder-neutral-600"
                placeholder="Model IDs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-neutral-400">System Prompt</label>
              <textarea 
                value={aeterna.systemPrompt}
                onChange={(e) => setAeterna({...aeterna, systemPrompt: e.target.value})}
                className="w-full h-32 bg-neutral-900 border border-neutral-800 rounded px-2 py-2 text-xs focus:outline-none focus:border-blue-500 resize-none font-mono"
              />
            </div>
          </div>

          <div className="h-px bg-neutral-800 w-full" />

          {/* NOVA Config */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center justify-between">
              <span className="text-emerald-400 font-mono">2. {nova.name}</span>
            </h3>
            
            <div className="flex gap-2">
              <select 
                value={nova.provider}
                onChange={(e) => setNova({...nova, provider: e.target.value as Provider})}
                className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs focus:outline-none flex-1"
              >
                <option value="openrouter">OpenRouter</option>
                <option value="google">Google API</option>
                <option value="ollama">Ollama</option>
              </select>
              <input 
                type="text"
                value={nova.model}
                onChange={(e) => setNova({...nova, model: e.target.value})}
                className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs focus:outline-none flex-1 placeholder-neutral-600"
                placeholder="Model ID"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-neutral-400">System Prompt</label>
              <textarea 
                value={nova.systemPrompt}
                onChange={(e) => setNova({...nova, systemPrompt: e.target.value})}
                className="w-full h-32 bg-neutral-900 border border-neutral-800 rounded px-2 py-2 text-xs focus:outline-none focus:border-emerald-500 resize-none font-mono"
              />
            </div>
          </div>

        </div>
      </div>

      {/* MAIN VIEW: Arena */}
      <div className="flex-1 flex flex-col min-w-0 bg-neutral-900 relative">
        {/* Header */}
        <header className="h-14 border-b border-neutral-800 flex items-center justify-between px-4 sticky top-0 bg-neutral-900/80 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-neutral-200 transition-colors"
              title="Toggle Environments & Prompts"
            >
              <Settings className="w-5 h-5" />
            </button>
            <div className="h-4 w-px bg-neutral-800" />
            <h1 className="font-medium tracking-tight text-neutral-200 flex items-center gap-2">
              Synthetic Debate Arena
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExport}
              disabled={messages.length === 0 || status !== "idle"}
              className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded bg-neutral-800/50 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            <button 
              onClick={clearChat}
              disabled={messages.length === 0 || status !== "idle"}
              className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded bg-neutral-800/50 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        </header>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6">
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-neutral-500 max-w-md mx-auto space-y-4">
              <MessageSquare className="w-12 h-12 opacity-20" />
              <p className="text-sm">Configure both agents in the side panel, then submit a topic to spark a debate.</p>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className="flex flex-col gap-1 w-full max-w-4xl mx-auto">
              <span className={cn(
                "text-[11px] font-bold tracking-widest uppercase ml-1",
                m.agentName === aeterna.name ? "text-blue-500" :
                m.agentName === nova.name ? "text-emerald-500" : "text-neutral-500"
              )}>
                {m.agentName}
              </span>
              <div className={cn(
                "px-5 py-4 rounded-xl leading-relaxed text-[15px] shadow-sm",
                m.agentName === aeterna.name ? "bg-blue-950/20 border border-blue-900/30 text-blue-50" :
                m.agentName === nova.name ? "bg-emerald-950/20 border border-emerald-900/30 text-emerald-50" :
                "bg-neutral-800/50 border border-neutral-700/50 text-neutral-200"
              )}>
                <div className="whitespace-pre-wrap font-sans">
                  {m.content}
                </div>
              </div>
            </div>
          ))}

          {status !== "idle" && status !== "error" && (
            <div className="flex flex-col gap-1 w-full max-w-4xl mx-auto opacity-70 animate-pulse">
                <span className={cn(
                  "text-[11px] font-bold tracking-widest uppercase ml-1",
                   status === "running_aeterna" ? "text-blue-500" : "text-emerald-500"
                )}>
                  {status === "running_aeterna" ? aeterna.name : nova.name} IS COMPUTING...
                </span>
                <div className="px-5 py-4 rounded-xl leading-relaxed text-[15px] bg-neutral-800/20 border border-neutral-800/50 flex space-x-2 items-center h-[56px]">
                  <div className="w-2 h-2 rounded-full bg-neutral-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-neutral-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-neutral-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
            </div>
          )}

          {errorMsg && (
            <div className="max-w-4xl mx-auto w-full px-5 py-3 rounded-xl bg-red-950/30 border border-red-900/50 text-red-400 text-sm">
              <span className="font-bold">System Error:</span> {errorMsg}
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-neutral-900 border-t border-neutral-800/80">
          <div className="max-w-4xl mx-auto flex items-end gap-3 rounded-xl bg-neutral-950 border border-neutral-800 p-2 focus-within:border-neutral-600 transition-colors shadow-sm">
            <textarea
              placeholder="Inject a prompt or topic to start the debate..."
              value={inputTopic}
              onChange={(e) => setInputTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleStartDebate();
                }
              }}
              className="flex-1 bg-transparent border-none resize-none px-3 py-2 text-[15px] focus:outline-none min-h-[44px] max-h-[160px] placeholder-neutral-600"
              rows={1}
            />
            <button
              onClick={handleStartDebate}
              disabled={status !== "idle" || !inputTopic.trim()}
              className="p-3 bg-neutral-100 text-neutral-950 rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0 mb-0.5"
            >
              {status !== "idle" ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
          </div>
          <div className="text-center mt-3 text-[11px] text-neutral-500">
            Engine starts with {aeterna.name}'s initial axiom analysis, followed by {nova.name}'s counter-perspective or recovery.
          </div>
        </div>
      </div>

    </div>
  );
}
