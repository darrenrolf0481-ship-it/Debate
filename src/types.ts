export type Provider = "google" | "openrouter" | "ollama";

export interface AgentConfig {
  name: string;
  provider: Provider;
  systemPrompt: string;
  model: string; // The model to use
  voice: string; // Edge TTS neural voice, e.g. "en-US-AriaNeural"
}

export interface AppSettings {
  googleApiKey: string;
  openRouterApiKey: string;
  ollamaBaseUrl: string;
  voiceEnabled: boolean; // Auto-speak agent replies
}

export interface Message {
  id: string;
  agentName: string;
  content: string;
}

export type DebateStatus = "idle" | "running_aeterna" | "running_nova" | "error";
