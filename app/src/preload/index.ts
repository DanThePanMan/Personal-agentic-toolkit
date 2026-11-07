import { contextBridge, ipcRenderer } from "electron";

import type { AgentApi } from "../shared/types";

const agentApi: AgentApi = {
  getOllamaStatus: () => ipcRenderer.invoke("agent:get-ollama-status"),
  startOllama: () => ipcRenderer.invoke("agent:start-ollama"),
  stopOllama: () => ipcRenderer.invoke("agent:stop-ollama"),
  showAppMenu: (name) => ipcRenderer.send("agent:show-app-menu", name),
  sendChat: (input) => ipcRenderer.invoke("agent:send-chat", input),
};

contextBridge.exposeInMainWorld("agentApi", agentApi);
