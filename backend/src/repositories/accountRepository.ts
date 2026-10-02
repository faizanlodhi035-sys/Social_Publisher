import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getFirestoreDb, isFirebaseConfigured } from "../firebase/admin.js";
import type { ConnectedAccount, StoredAccountRecord, AccountTokens, SocialPlatform, ConnectionStatus } from "../types/index.js";
import { encryptToken, decryptToken } from "../utils/crypto.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../data");
const STORE_FILE = path.join(DATA_DIR, "accounts.json");

export class AccountRepository {
  private memoryStore: Map<string, StoredAccountRecord> = new Map();

  constructor() {
    this.ensureDataDirectory();
    this.loadFromDisk();
  }

  private ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, "utf-8");
        const list = JSON.parse(raw) as StoredAccountRecord[];
        for (const item of list) {
          this.memoryStore.set(item.id, item);
        }
      }
    } catch (err) {
      console.error("[AccountRepository] Failed to read fallback store from disk:", err);
    }
  }

  private saveToDisk() {
    try {
      const list = Array.from(this.memoryStore.values());
      fs.writeFileSync(STORE_FILE, JSON.stringify(list, null, 2), "utf-8");
    } catch (err) {
      console.error("[AccountRepository] Failed to write fallback store to disk:", err);
    }
  }

  /**
   * Returns normalized accounts without sensitive tokens for API client consumption.
   */
  public async getAllAccounts(workspaceId = "default-workspace"): Promise<ConnectedAccount[]> {
    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        const snapshot = await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("accounts")
          .get();

        const accounts: ConnectedAccount[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as ConnectedAccount;
          accounts.push(data);
        });
        return accounts;
      } catch (err) {
        console.warn("[AccountRepository] Firestore read failed, falling back to local store:", err);
      }
    }

    const records = Array.from(this.memoryStore.values()).filter(
      (rec: any) => !rec.workspaceId || rec.workspaceId === workspaceId
    );
    return records.map((rec) => this.stripTokens(rec));
  }

  /**
   * Returns a single account without sensitive tokens.
   */
  public async getAccountById(id: string, workspaceId = "default-workspace"): Promise<ConnectedAccount | null> {
    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        const doc = await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("accounts")
          .doc(id)
          .get();

        if (doc.exists) {
          return doc.data() as ConnectedAccount;
        }
      } catch (err) {
        console.warn("[AccountRepository] Firestore getById failed, falling back:", err);
      }
    }

    const record = this.memoryStore.get(id);
    if (record && ((record as any).workspaceId === workspaceId || !(record as any).workspaceId)) {
      return this.stripTokens(record);
    }
    return null;
  }

  /**
   * Server-internal method to get account with sensitive tokens.
   */
  public async getAccountWithTokens(id: string, workspaceId = "default-workspace"): Promise<StoredAccountRecord | null> {
    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        const accountDoc = await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("accounts")
          .doc(id)
          .get();

        if (accountDoc.exists) {
          const safeAccount = accountDoc.data() as ConnectedAccount;

          const tokenDoc = await db
            .collection("workspaces")
            .doc(workspaceId)
            .collection("accounts")
            .doc(id)
            .collection("secrets")
            .doc("tokens")
            .get();

          if (tokenDoc.exists) {
            const rawTokens = tokenDoc.data() as AccountTokens;
            const decryptedTokens: AccountTokens = {
              ...rawTokens,
              accessToken: decryptToken(rawTokens.accessToken),
              refreshToken: rawTokens.refreshToken ? decryptToken(rawTokens.refreshToken) : undefined,
            };
            return {
              ...safeAccount,
              tokens: decryptedTokens,
            };
          }
        }
      } catch (err) {
        console.warn("[AccountRepository] Firestore getAccountWithTokens failed, falling back:", err);
      }
    }

    const rec = this.memoryStore.get(id);
    if (rec && ((rec as any).workspaceId === workspaceId || !(rec as any).workspaceId)) {
      return rec;
    }
    return null;
  }

  /**
   * Finds an existing account by platform and platformAccountId.
   */
  public async findByPlatformAccountId(
    platform: SocialPlatform,
    platformAccountId: string,
    workspaceId = "default-workspace"
  ): Promise<StoredAccountRecord | null> {
    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        const snapshot = await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("accounts")
          .where("platform", "==", platform)
          .where("platformAccountId", "==", platformAccountId)
          .limit(1)
          .get();

        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          return this.getAccountWithTokens(doc.id, workspaceId);
        }
      } catch (err) {
        console.warn("[AccountRepository] Firestore findByPlatformAccountId failed, falling back:", err);
      }
    }

    for (const record of this.memoryStore.values()) {
      if (
        record.platform.toLowerCase() === platform.toLowerCase() &&
        record.platformAccountId === platformAccountId &&
        ((record as any).workspaceId === workspaceId || !(record as any).workspaceId)
      ) {
        return record;
      }
    }
    return null;
  }

  /**
   * Saves or updates an account record with tokens in Firestore.
   */
  public async saveAccount(
    data: {
      platform: SocialPlatform;
      platformAccountId: string;
      username: string;
      displayName: string;
      avatarUrl?: string;
      capabilities?: { publish: boolean; analytics: boolean };
    },
    tokens: AccountTokens,
    workspaceId = "default-workspace"
  ): Promise<ConnectedAccount> {
    const existing = await this.findByPlatformAccountId(data.platform, data.platformAccountId, workspaceId);
    const now = new Date().toISOString().split("T")[0];
    const id = existing ? existing.id : `${data.platform.toLowerCase()}-${data.platformAccountId}`;

    const record: StoredAccountRecord & { workspaceId?: string } = {
      id,
      workspaceId,
      platform: data.platform,
      platformAccountId: data.platformAccountId,
      username: data.username,
      displayName: data.displayName,
      avatarUrl: data.avatarUrl || existing?.avatarUrl || "",
      status: "connected",
      connectedAt: existing?.connectedAt || now,
      updatedAt: new Date().toISOString(),
      capabilities: data.capabilities || { publish: true, analytics: true },
      tokens,
    };

    // Remove any strictly undefined values to prevent Firestore crashes
    Object.keys(record).forEach((key) => {
      if ((record as any)[key] === undefined) {
        delete (record as any)[key];
      }
    });

    // Update memory fallback
    this.memoryStore.set(id, record);
    this.saveToDisk();

    // Persist to Firestore
    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        const safeAccount = this.stripTokens(record);

        // 1. Store public account metadata
        await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("accounts")
          .doc(id)
          .set(safeAccount, { merge: true });

        // 2. Store private encrypted tokens in protected subcollection
        const encryptedTokens: AccountTokens = {
          ...tokens,
          accessToken: encryptToken(tokens.accessToken),
          refreshToken: tokens.refreshToken ? encryptToken(tokens.refreshToken) : undefined,
        };

        await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("accounts")
          .doc(id)
          .collection("secrets")
          .doc("tokens")
          .set(encryptedTokens, { merge: true });
      } catch (err) {
        console.warn("[AccountRepository] Firestore saveAccount write failed:", err);
      }
    }

    return this.stripTokens(record);
  }

  /**
   * Updates tokens and status for an account.
   */
  public async updateAccountTokens(
    id: string,
    tokens: AccountTokens,
    status: ConnectionStatus = "connected",
    workspaceId = "default-workspace"
  ): Promise<boolean> {
    const record = this.memoryStore.get(id);
    if (record) {
      record.tokens = tokens;
      record.status = status;
      record.updatedAt = new Date().toISOString();
      this.memoryStore.set(id, record);
      this.saveToDisk();
    }

    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("accounts")
          .doc(id)
          .update({ status, updatedAt: new Date().toISOString() });

        await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("accounts")
          .doc(id)
          .collection("secrets")
          .doc("tokens")
          .set(tokens, { merge: true });

        return true;
      } catch (err) {
        console.warn("[AccountRepository] Firestore updateAccountTokens failed:", err);
      }
    }

    return Boolean(record);
  }

  /**
   * Updates status for an account.
   */
  public async updateAccountStatus(
    id: string,
    status: ConnectionStatus,
    workspaceId = "default-workspace"
  ): Promise<boolean> {
    const record = this.memoryStore.get(id);
    if (record) {
      record.status = status;
      record.updatedAt = new Date().toISOString();
      this.memoryStore.set(id, record);
      this.saveToDisk();
    }

    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("accounts")
          .doc(id)
          .update({ status, updatedAt: new Date().toISOString() });
        return true;
      } catch (err) {
        console.warn("[AccountRepository] Firestore updateAccountStatus failed:", err);
      }
    }

    return Boolean(record);
  }

  /**
   * Disconnects / removes an account.
   */
  public async deleteAccount(id: string, workspaceId = "default-workspace"): Promise<boolean> {
    const existed = this.memoryStore.delete(id);
    if (existed) {
      this.saveToDisk();
    }

    const db = getFirestoreDb();
    if (db && isFirebaseConfigured()) {
      try {
        // Delete token secrets subcollection doc
        await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("accounts")
          .doc(id)
          .collection("secrets")
          .doc("tokens")
          .delete();

        // Delete public account doc
        await db
          .collection("workspaces")
          .doc(workspaceId)
          .collection("accounts")
          .doc(id)
          .delete();
      } catch (err) {
        console.warn("[AccountRepository] Firestore deleteAccount failed:", err);
      }
    }

    return existed;
  }

  private stripTokens(record: StoredAccountRecord): ConnectedAccount {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tokens, ...safeAccount } = record;
    return safeAccount;
  }
}

export const accountRepository = new AccountRepository();
