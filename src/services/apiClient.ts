import { auth } from "../lib/firebase";

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const currentUser = auth.currentUser;
  const savedLocalEmail = localStorage.getItem("sp_local_user_email");

  if (currentUser) {
    try {
      const idToken = await currentUser.getIdToken();
      headers["Authorization"] = `Bearer ${idToken}`;
      headers["x-user-id"] = currentUser.uid;
      headers["x-workspace-id"] = `ws_${currentUser.uid.replace(/[^a-zA-Z0-9_-]/g, "")}`;
      if (currentUser.email) {
        headers["x-user-email"] = currentUser.email;
      }
    } catch {
      // Fallback for dev
      headers["Authorization"] = `Bearer ${currentUser.uid}`;
      headers["x-user-id"] = currentUser.uid;
      headers["x-workspace-id"] = `ws_${currentUser.uid.replace(/[^a-zA-Z0-9_-]/g, "")}`;
    }
  } else if (savedLocalEmail) {
    const hash = Math.abs(savedLocalEmail.split("").reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0));
    const uid = `dev-user-${hash}`;
    headers["Authorization"] = `Bearer ${uid}`;
    headers["x-user-id"] = uid;
    headers["x-user-email"] = savedLocalEmail;
    headers["x-workspace-id"] = `ws_${uid}`;
  } else {
    // Default fallback
    headers["Authorization"] = `Bearer dev_default_user`;
    headers["x-user-id"] = "dev_default_user";
    headers["x-workspace-id"] = "ws_dev_default_user";
  }

  return headers;
}

export async function authenticatedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const authHeaders = await getAuthHeaders();
  const isFormData = init?.body instanceof FormData;

  const combinedHeaders: Record<string, string> = {
    ...authHeaders,
    ...((init?.headers as Record<string, string>) || {}),
  };

  if (isFormData) {
    delete combinedHeaders["Content-Type"];
  }

  return fetch(input, {
    ...init,
    headers: combinedHeaders,
  });
}
