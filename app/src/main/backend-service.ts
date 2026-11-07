import { app } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const apiUrl = "http://127.0.0.1:8000";
let backendProcess: ChildProcess | undefined;

function workspacePath(): string {
  return join(app.getAppPath(), "..");
}

async function isHealthy(): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl}/health`, {
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

export async function startBackend(): Promise<void> {
  if (await isHealthy()) {
    return;
  }

  if (backendProcess && !backendProcess.killed) {
    return;
  }

  const localPython = join(
    workspacePath(),
    ".venv",
    process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
  );
  const usesLocalPython = existsSync(localPython);
  backendProcess = spawn(
    usesLocalPython ? localPython : "uv",
    usesLocalPython
      ? ["-m", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000"]
      : ["run", "uvicorn", "backend.main:app", "--host", "127.0.0.1", "--port", "8000"],
    {
      cwd: workspacePath(),
      shell: !usesLocalPython && process.platform === "win32",
      windowsHide: true,
      stdio: "ignore",
    },
  );

  backendProcess.once("error", () => {
    backendProcess = undefined;
  });

  backendProcess.once("exit", () => {
    backendProcess = undefined;
  });

  await waitForHealth();
}

export function stopBackend(): void {
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
  }
  backendProcess = undefined;
}

export const localApiUrl = apiUrl;
