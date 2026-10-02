import { getStorageBucket } from "./admin.js";

export function getFirebaseBucket() {
  const bucket = getStorageBucket();
  return bucket;
}
