import { BrowserWindow, dialog, ipcMain, Menu } from "electron";

import { localApiUrl } from "./backend-service";
import { getOllamaStatus, startOllama, stopOllama } from "./ollama-service";
import type { ChatMessage, ChatResult } from "../shared/types";

const appMenus = {
  file: Menu.buildFromTemplate([{ label: "Close window", role: "close" }]),
  edit: Menu.buildFromTemplate([
    { role: "undo" },
    { role: "redo" },
    { type: "separator" },
    { role: "cut" },
    { role: "copy" },
    { role: "paste" },
    { role: "selectAll" },
  ]),
  view: Menu.buildFromTemplate([
    { role: "reload" },
    { role: "forceReload" },
    { role: "toggleDevTools" },
    { type: "separator" },
    { role: "resetZoom" },
    { role: "zoomIn" },
    { role: "zoomOut" },
    { type: "separator" },
    { role: "togglefullscreen" },
  ]),
  help: Menu.buildFromTemplate([
    {
      label: "About Personal Agentic Toolkit",
      click: (_item, window) => {
        if (!window) {
          return;
        }
        void dialog.showMessageBox(window, {
          title: "Personal Agentic Toolkit",
          message: "Personal Agentic Toolkit",
          detail: "A local desktop chat surface for your Ollama agent.",
        });
      },
    },
  ]),
} as const;

type AppMenuName = keyof typeof appMenus;

ipcMain.handle("agent:get-ollama-status", () => getOllamaStatus());
ipcMain.handle("agent:start-ollama", () => startOllama());
ipcMain.handle("agent:stop-ollama", () => stopOllama());
ipcMain.on("agent:show-app-menu", (event, name: AppMenuName) => {
  const menu = appMenus[name];
  const window = BrowserWindow.fromWebContents(event.sender);
  if (menu && window) {
    menu.popup({ window });
  }
});

ipcMain.handle(
  "agent:send-chat",
  async (_event, input: { message: string; history: ChatMessage[] }): Promise<ChatResult> => {
    const response = await fetch(`${localApiUrl}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(65_000),
    });

    if (!response.ok) {
      throw new Error("The local agent could not answer. Check that Ollama is running and the configured model is installed.");
    }

    return (await response.json()) as ChatResult;
  },
);
