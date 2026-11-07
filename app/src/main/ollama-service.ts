import { execFile, spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

import type { ServiceStatus } from "../shared/types";

const ollamaUrl = "http://127.0.0.1:11434";
const execFileAsync = promisify(execFile);
let ollamaProcess: ChildProcess | undefined;
let lastFailure: string | undefined;
let isStopping = false;

async function isHealthy(): Promise<boolean> {
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(1_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForHealth(): Promise<boolean> {
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    if (await isHealthy()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return false;
}

async function waitForStop(): Promise<boolean> {
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    if (!(await isHealthy())) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return false;
}

async function getServerProcessIds(): Promise<number[]> {
  if (process.platform !== "win32") {
    return [];
  }

  const { stdout } = await execFileAsync("netstat", ["-ano", "-p", "tcp"], {
    windowsHide: true,
  });

  return [...new Set(
    stdout
      .split("\n")
      .filter((line) => line.includes("LISTENING") && /(?:127\.0\.0\.1|\[::1\]):11434\s/.test(line))
      .map((line) => Number(line.trim().split(/\s+/).at(-1)))
      .filter((processId) => Number.isInteger(processId) && processId > 0),
  )];
}

function getExecutable(): { command: string; shell: boolean } {
  const candidates = [
    process.env.OLLAMA_EXECUTABLE,
    process.env.ProgramFiles ? join(process.env.ProgramFiles, "Ollama", "ollama.exe") : undefined,
    process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "Programs", "Ollama", "ollama.exe") : undefined,
  ].filter((candidate): candidate is string => Boolean(candidate));
  const executable = candidates.find((candidate) => existsSync(candidate));

  return executable
    ? { command: executable, shell: false }
    : { command: "ollama", shell: process.platform === "win32" };
}

export async function getOllamaStatus(): Promise<ServiceStatus> {
  if (await isHealthy()) {
    return { state: "available" };
  }

  if (ollamaProcess && !ollamaProcess.killed) {
    return { state: "starting" };
  }

  if (lastFailure) {
    return { state: "unavailable", detail: lastFailure };
  }

  return { state: "stopped" };
}

export async function startOllama(): Promise<ServiceStatus> {
  if (await isHealthy()) {
    return { state: "available" };
  }

  if (ollamaProcess && !ollamaProcess.killed) {
    return getOllamaStatus();
  }

  lastFailure = undefined;
  isStopping = false;
  const executable = getExecutable();
  ollamaProcess = spawn(executable.command, ["serve"], {
    shell: executable.shell,
    windowsHide: true,
    stdio: "ignore",
  });

  ollamaProcess.once("error", (error) => {
    lastFailure = `Could not start Ollama: ${error.message}`;
    ollamaProcess = undefined;
  });

  ollamaProcess.once("exit", (code) => {
    if (!isStopping && code !== 0) {
      lastFailure = "Ollama stopped unexpectedly.";
    }
    ollamaProcess = undefined;
    isStopping = false;
  });

  if (await waitForHealth()) {
    return { state: "available" };
  }

  lastFailure ??= "Ollama did not become available. Install Ollama or set OLLAMA_EXECUTABLE.";
  return { state: "unavailable", detail: lastFailure };
}

export async function stopOllama(): Promise<ServiceStatus> {
  isStopping = true;
  lastFailure = undefined;

  try {
    const processIds = await getServerProcessIds();

    if (process.platform === "win32") {
      await Promise.all(
        processIds.map((processId) => execFileAsync("taskkill", ["/PID", String(processId), "/T", "/F"], {
          windowsHide: true,
        })),
      );
    } else if (ollamaProcess && !ollamaProcess.killed) {
      ollamaProcess.kill();
    }

    ollamaProcess = undefined;
    if (await waitForStop()) {
      return { state: "stopped" };
    }

    lastFailure = "Ollama did not stop.";
    return { state: "unavailable", detail: lastFailure };
  } catch (error) {
    lastFailure = error instanceof Error ? `Could not stop Ollama: ${error.message}` : "Could not stop Ollama.";
    return { state: "unavailable", detail: lastFailure };
  } finally {
    isStopping = false;
  }
}
