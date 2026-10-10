import fsp from "node:fs/promises";
import { daemonPidPath } from "./config/paths";

/**
 * True when the shared Codex app-server daemon is running. It keeps the
 * login in memory, so interactive `codex` ignores a switched auth.json.
 */
export async function isCodexDaemonRunning(): Promise<boolean> {
  try {
    const { pid } = JSON.parse(await fsp.readFile(daemonPidPath, "utf8"));
    if (!Number.isInteger(pid)) return false;
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM: the process exists but belongs to another user.
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}
