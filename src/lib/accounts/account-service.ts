import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { accountsDir, authPath, codexDir, currentNamePath } from "../config/paths";
import {
  AccountNotFoundError,
  AuthFileMissingError,
  InvalidAccountNameError,
  UnsavedActiveAuthError,
} from "./errors";
import { readAuthIdentity } from "./auth-identity";

const ACCOUNT_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
const AUTH_FILE_MODE = 0o600;

export class AccountService {
  public async listAccountNames(): Promise<string[]> {
    if (!(await this.pathExists(accountsDir))) {
      return [];
    }

    const entries = await fsp.readdir(accountsDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name.replace(/\.json$/i, ""))
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }

  public async getCurrentAccountName(): Promise<string | null> {
    const currentName = await this.readCurrentNameFile();
    const owner = await this.findOwnerOfActiveAuth(currentName);
    return owner ?? currentName;
  }

  public async saveAccount(rawName: string): Promise<string> {
    const name = this.normalizeAccountName(rawName);
    await this.ensureAuthFileExists();
    await this.ensureDir(accountsDir);
    const destination = this.accountFilePath(name);
    await fsp.copyFile(authPath, destination);
    await fsp.chmod(destination, AUTH_FILE_MODE);
    return name;
  }

  public async useAccount(rawName: string): Promise<string> {
    const name = this.normalizeAccountName(rawName);
    const source = this.accountFilePath(name);

    if (!(await this.pathExists(source))) {
      throw new AccountNotFoundError(name);
    }

    await this.ensureDir(codexDir);
    await this.syncActiveAuthBack();
    // Copy instead of symlink: Codex replaces auth.json with a regular file on
    // token refresh, so a symlink would silently detach from the saved account.
    await this.atomicCopy(source, authPath);

    await this.writeCurrentName(name);
    return name;
  }

  private accountFilePath(name: string): string {
    return path.join(accountsDir, `${name}.json`);
  }

  private normalizeAccountName(rawName: string | undefined): string {
    if (typeof rawName !== "string") {
      throw new InvalidAccountNameError();
    }

    const trimmed = rawName.trim();
    if (!trimmed.length) {
      throw new InvalidAccountNameError();
    }

    const withoutExtension = trimmed.replace(/\.json$/i, "");
    if (!ACCOUNT_NAME_PATTERN.test(withoutExtension)) {
      throw new InvalidAccountNameError();
    }

    return withoutExtension;
  }

  private async ensureAuthFileExists(): Promise<void> {
    if (!(await this.pathExists(authPath))) {
      throw new AuthFileMissingError(authPath);
    }
  }

  private async ensureDir(dirPath: string): Promise<void> {
    await fsp.mkdir(dirPath, { recursive: true });
  }

  /** Saves refreshed tokens from the active auth.json back to their account file. */
  private async syncActiveAuthBack(): Promise<void> {
    if (!(await this.pathExists(authPath))) return;
    if ((await fsp.lstat(authPath)).isSymbolicLink()) return;

    const owner = await this.findOwnerOfActiveAuth(await this.readCurrentNameFile());
    if (!owner) throw new UnsavedActiveAuthError();

    await this.atomicCopy(authPath, this.accountFilePath(owner));
  }

  private async findOwnerOfActiveAuth(preferred: string | null): Promise<string | null> {
    const identity = await readAuthIdentity(authPath);
    if (!identity) return null;

    const matches: string[] = [];
    for (const name of await this.listAccountNames()) {
      if ((await readAuthIdentity(this.accountFilePath(name))) === identity) {
        matches.push(name);
      }
    }

    if (preferred && matches.includes(preferred)) return preferred;
    return matches[0] ?? null;
  }

  private async atomicCopy(source: string, destination: string): Promise<void> {
    const temp = `${destination}.tmp.${process.pid}.${Date.now()}`;
    await fsp.copyFile(source, temp);
    await fsp.chmod(temp, AUTH_FILE_MODE);
    await fsp.rename(temp, destination);
  }

  private async writeCurrentName(name: string): Promise<void> {
    await this.ensureDir(codexDir);
    await fsp.writeFile(currentNamePath, `${name}\n`, "utf8");
    await fsp.chmod(currentNamePath, AUTH_FILE_MODE);
  }

  private async readCurrentNameFile(): Promise<string | null> {
    try {
      const contents = await fsp.readFile(currentNamePath, "utf8");
      const trimmed = contents.trim();
      return trimmed.length ? trimmed : null;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  private async pathExists(targetPath: string): Promise<boolean> {
    try {
      await fsp.access(targetPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}
