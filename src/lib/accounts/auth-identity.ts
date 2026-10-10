import fsp from "node:fs/promises";

/**
 * Returns a stable identity ("<account_id>|<email>") for a Codex auth file,
 * or null when the file is missing or holds no ChatGPT tokens.
 */
export async function readAuthIdentity(filePath: string): Promise<string | null> {
  let parsed: { tokens?: { account_id?: string; id_token?: string } };
  try {
    parsed = JSON.parse(await fsp.readFile(filePath, "utf8"));
  } catch {
    return null;
  }

  const accountId = parsed.tokens?.account_id;
  if (!accountId) return null;

  return `${accountId}|${decodeEmail(parsed.tokens?.id_token) ?? ""}`;
}

function decodeEmail(idToken: string | undefined): string | null {
  const payload = idToken?.split(".")[1];
  if (!payload) return null;

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof claims.email === "string" ? claims.email : null;
  } catch {
    return null;
  }
}
