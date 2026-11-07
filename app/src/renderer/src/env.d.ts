/// <reference types="vite/client" />

import type { AgentApi } from "../../../shared/types";

declare global {
  interface Window {
    agentApi: AgentApi;
  }
}

export {};
