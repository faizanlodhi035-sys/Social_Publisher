import { getFirestoreDb } from "./admin.js";

export function getWorkspaceCollection(workspaceId = "default-workspace", collectionName: string) {
  const db = getFirestoreDb();
  if (!db) return null;
  return db.collection("workspaces").doc(workspaceId).collection(collectionName);
}

export function getWorkspaceDoc(workspaceId = "default-workspace") {
  const db = getFirestoreDb();
  if (!db) return null;
  return db.collection("workspaces").doc(workspaceId);
}
