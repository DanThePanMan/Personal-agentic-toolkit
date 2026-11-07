export type MessageRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
};

export type ServiceStatus = {
  state: "starting" | "available" | "stopped" | "unavailable";
  detail?: string;
};

export type ChatResult = {
  message: string;
  model: string;
};

export type AgentApi = {
  getOllamaStatus: () => Promise<ServiceStatus>;
  startOllama: () => Promise<ServiceStatus>;
  stopOllama: () => Promise<ServiceStatus>;
  showAppMenu: (name: "file" | "edit" | "view" | "help") => void;
  sendChat: (input: {
    message: string;
    history: ChatMessage[];
  }) => Promise<ChatResult>;
};
