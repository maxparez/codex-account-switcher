export class CodexAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class AuthFileMissingError extends CodexAuthError {
  constructor(targetPath: string) {
    super(
      `No Codex auth file found at ${targetPath}. ` +
        `Log into Codex first so ~/.codex/auth.json exists.`,
    );
  }
}

export class AccountNotFoundError extends CodexAuthError {
  constructor(accountName: string) {
    super(`No saved Codex account named "${accountName}" was found.`);
  }
}

export class NoAccountsSavedError extends CodexAuthError {
  constructor() {
    super(`No saved Codex accounts yet. Run "codex-auth save <name>" first.`);
  }
}

export class UnsavedActiveAuthError extends CodexAuthError {
  constructor() {
    super(
      "The active ~/.codex/auth.json does not match any saved account. " +
        'Run "codex-auth save <name>" first so its login is not lost.',
    );
  }
}

export class InvalidAccountNameError extends CodexAuthError {
  constructor() {
    super(
      "Account names must include at least one non-space character and " +
        "may contain letters, numbers, dashes, underscores, and dots.",
    );
  }
}

export class PromptCancelledError extends CodexAuthError {
  constructor() {
    super("No account selected. The operation was cancelled.");
  }
}
