import crypto from "crypto";
import { envConfig } from "../config/env.js";

// Derive a consistent 32-byte key for AES-256-GCM encryption
function getEncryptionKey(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY || envConfig.SESSION_SECRET || "default_dev_secret_key_must_be_32_bytes";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a sensitive OAuth token (access_token, refresh_token) using AES-256-GCM.
 * Output format: "enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */
export function encryptToken(plaintext: string): string {
  if (!plaintext || typeof plaintext !== "string") {
    return plaintext;
  }

  // Avoid re-encrypting already encrypted tokens
  if (plaintext.startsWith("enc:v1:")) {
    return plaintext;
  }

  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `enc:v1:${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted token.
 * Gracefully handles legacy plaintext tokens for backward compatibility.
 */
export function decryptToken(ciphertext: string): string {
  if (!ciphertext || typeof ciphertext !== "string") {
    return ciphertext;
  }

  // Not an encrypted token format, return as-is
  if (!ciphertext.startsWith("enc:v1:")) {
    return ciphertext;
  }

  try {
    const parts = ciphertext.split(":");
    if (parts.length !== 5) {
      throw new Error("Invalid encrypted token format.");
    }

    const ivHex = parts[2];
    const authTagHex = parts[3];
    const encryptedHex = parts[4];

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const key = getEncryptionKey();

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    console.error("[Crypto] Failed to decrypt token:", (err as Error).message);
    throw new Error("Failed to decrypt secure account token. Token may be corrupted or encryption key changed.");
  }
}

/**
 * Constant-time string equality check to prevent timing attacks.
 */
export function timingSafeMatch(a: string, b: string): boolean {
  if (!a || !b || typeof a !== "string" || typeof b !== "string") {
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Generates an HMAC-signed CSRF state token encoding target platform and workspace.
 */
export function generateStateToken(platform: string, workspaceId = "default-workspace"): string {
  const nonce = crypto.randomBytes(24).toString("hex");
  const timestamp = Date.now();
  const payload = JSON.stringify({ platform, workspaceId, timestamp, nonce });
  const base64 = Buffer.from(payload).toString("base64url");
  const signature = crypto
    .createHmac("sha256", envConfig.SESSION_SECRET)
    .update(base64)
    .digest("hex");

  return `${base64}.${signature}`;
}

/**
 * Verifies an HMAC-signed state token and extracts the authenticated workspaceId.
 */
export function verifyStateToken(
  stateToken: string,
  expectedPlatform: string
): { valid: boolean; workspaceId?: string } {
  try {
    if (!stateToken || typeof stateToken !== "string") {
      return { valid: false };
    }

    const parts = stateToken.split(".");
    if (parts.length !== 2) {
      // Legacy unsigned state token fallback for backward compatibility
      try {
        const decoded = Buffer.from(stateToken, "base64url").toString("utf-8");
        const parsed = JSON.parse(decoded);
        if (parsed.platform?.toLowerCase() === expectedPlatform.toLowerCase()) {
          const maxAge = 15 * 60 * 1000;
          if (Date.now() - parsed.timestamp <= maxAge) {
            return { valid: true, workspaceId: parsed.workspaceId || "default-workspace" };
          }
        }
      } catch {
        return { valid: false };
      }
      return { valid: false };
    }

    const [base64, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", envConfig.SESSION_SECRET)
      .update(base64)
      .digest("hex");

    if (!timingSafeMatch(signature, expectedSignature)) {
      return { valid: false };
    }

    const decoded = Buffer.from(base64, "base64url").toString("utf-8");
    const parsed = JSON.parse(decoded);

    if (parsed.platform?.toLowerCase() !== expectedPlatform.toLowerCase()) {
      return { valid: false };
    }

    // State token valid for 15 minutes
    const maxAge = 15 * 60 * 1000;
    if (Date.now() - parsed.timestamp > maxAge) {
      return { valid: false };
    }

    return { valid: true, workspaceId: parsed.workspaceId || "default-workspace" };
  } catch {
    return { valid: false };
  }
}
