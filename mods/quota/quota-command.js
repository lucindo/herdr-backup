// Only the providers in use: quota-axi asks each one's vendor on every read.
const ARGS = ["--json", "--provider", "claude,codex"];
export const QUOTA_LINE = ["quota-axi", ...ARGS].join(" ");

// npm installs a .cmd shim on Windows, which cannot be spawned as a native executable.
// Keep exec injectable so the fallback and machine forwarding can be checked without Herdr.
export async function runQuotaCommand(exec, options = {}) {
  try {
    return await exec("quota-axi", ARGS, options);
  } catch (startError) {
    try {
      // Fixed command only: never interpolate paths, credentials or caller arguments into cmd.
      return await exec("cmd.exe", ["/d", "/s", "/c", QUOTA_LINE], options);
    } catch {
      // On Unix, let the existing login-shell fallback handle PATH discovery.
      throw startError;
    }
  }
}
