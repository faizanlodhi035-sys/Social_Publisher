import crypto from 'crypto';

function getEncryptionKey() {
  const secret = process.env.TOKEN_ENCRYPTION_KEY || "social_publisher_secure_session_key";
  return crypto.createHash("sha256").update(secret).digest();
}

function decryptToken(ciphertext) {
  try {
    const parts = ciphertext.split(":");
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
    console.error("Decrypt failed:", err);
    return null;
  }
}

const token = 'enc:v1:bbd87f57d402fdd75cedf7f2:373776dd6bac6393c5fd0332d1d60007:9381ef04a95696c269c623ad7dcef86e4bc90ec9916e753fe851e02e2189d5d2038e1106003caaa779b122aedb32ebb9d8b7391e4d12ecde920cdf7ea76b12f182eb062ae5f9a5aaca9b2d763baf2428324fc42808ba762b29646bc919957463acf0d534bc7a798ca1e837429edbde24cae0deccc17b94b14eb5c6730bdbb3767c75a73ec1a79f73bca5c0e6c14ed8119826223e189064cddd2fa203b044558b21a75c1adb7d0425cb1380cbcf365d8bda5c0f1b453bcdf1c6098ab3d10657c55f381ab7528d8de8f123810c6820e7b624a82c6729878abb7d64a1ffa04f9068797ebebc2f2b83beea97d51d1c92ee50e665768ea892dcbd498408c096';

console.log("Decrypted with secure_session_key:", decryptToken(token));

// Also try the fallback default
process.env.TOKEN_ENCRYPTION_KEY = "social_publisher_dev_secret_key_change_in_prod";
console.log("Decrypted with fallback:", decryptToken(token));
