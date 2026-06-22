export type Provider = "google" | "openrouter" | "ollama";

export interface AgentConfig {
  name: string;
  provider: Provider;
  systemPrompt: string;
  model: string; // The model to use
}

export interface AppSettings {
  googleApiKey: string;
  openRouterApiKey: string;
  ollamaBaseUrl: string;
}

export interface Message {
  id: string;
  agentName: string;
  content: string;
}

export type DebateStatus = "idle" | "running_aeterna" | "running_nova" | "error";
