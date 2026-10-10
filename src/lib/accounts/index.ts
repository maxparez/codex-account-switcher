import { AccountService } from "./account-service";

export { AccountService } from "./account-service";
export {
  AccountNotFoundError,
  AuthFileMissingError,
  CodexAuthError,
  InvalidAccountNameError,
  NoAccountsSavedError,
  PromptCancelledError,
  UnsavedActiveAuthError,
} from "./errors";

export const accountService = new AccountService();
