import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = {
  projectId: "social-publisher027",
  clientEmail: "firebase-adminsdk-fbsvc@social-publisher027.iam.gserviceaccount.com",
  privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC/Bk28R3WcJt27\n/CpacmKBcNYsmezmZXX+rxt0mk6nbEsMrjAXj7YrPhj4DYL1E9sWKwysBVSO+ltP\n79oauEJR17Vhrde4oRcBazOGYq9M+kqg/JB6XZ56GhsuR2MnrCSItrA7mDBVn9yX\npxDpsbIDYVkEjX/94XQP0GA5YtPfcFDWk1PJeKOnnnpgoiM0dNHi3HuU9uq1zCaL\nJWvVeMHrNFCc3DMI05iswOz1xzeQokqxoY2dzQtCb7Jd+F0w9Iykxe/WGXGjCFbQ\nXHNwS6V6+lOHGlA8YRt5fByLfQxLHqxk4efJKcpNZ2fkonZ44RdqCG3bdq4tgLoI\naJYyrI8LAgMBAAECggEABD1kLYEHuwiHZ8W7PVJIN24R6UZQiMIvWHctTKA9wKxZ\npuIy23Y4HKuX+EffsTrYl2krMqI62m8m5ny0KMWpyyrWsfoezWoRGnOO3pu2hY0R\nacaEgM+VIrBAcpccPBdioQCVCfpg9qjB4UFqOBWjYtae5PssoEdU9FWzdqXOS0MN\nsmJjArDiEISzil242Z/sNAbdQP5xMxrZAWcLPfkE7l3Mfzt+VkecKlAPjAkAgZFU\nbeCr/Q5CKHILyVcaCQ57YKyAKZGOlgBgBmsHpLjnwKNINI+mh9K9Msy5RJTTcx84\nhYVds3wzLnghNWcvLWHyz4ytL7R+vOTFU52O25sB2QKBgQDlTug9Fz1uHoOdBCCi\njO6XFgW/+felx+eAVZ+JFXxFZfBjsoefL48rqwoJDnn8S/xKPZQmLX+dL/noVDbI\ndhtdbLqGDElcaI09Y+GLOsCDP5jDTzf03cScUYbiPkRz1DO9zAri1Neh1OtjwADB\nqB9rwXYll++IPWDiJEzI5LM+pQKBgQDVQpgDCqtKIGUWniPxDZr08I23cRgD2zHA\nCTv+8O/U8TJipkH/fbCMWNyc2w+/7/Q/vT9x58sxRATmwzzZ3g/FhmsTriAq/RDm\ndQ8VKpIOALLmYIdjK7OnVBxbVa/76PLzHNrRIga3MGnFAixkf3XslTJgjdprtCly\n8ZMl1e9X7wKBgQClMpmhGVMKODV9MvIH6RwiAJ2X1o+RAVlIXWcXrUDgBjaOvJl0\nFyE/xnLuX12GY3+YRJCsiG69YUjbFYB6HoxMW/5sgAGB71iBd6mPUn5Kj9CQNEwN\nvo7cRuezqkRKZf/4pjzZeZj3X5tNO4/P9DzetntVTgYk0oMvqBMhT5HKeQKBgDwA\nU5KvgsgFW0vEzKn6wPlfYRAWwsH6/wFf18B/+4p3Hk0BKBqBO5YRPmjnfYPsOFVi\noqIirFm9IH/ouIs33kod6qyL1kMiFoowr0CuTI+iBLOqvwzY8+AFW0EbV7tRrGFY\nYfxrTWZnOasTVHgmIICi7Zya7LRW6T6M13DSw1eDAoGAaezQotU97KmImZ3PNQ8o\nAZT+ZtL4xuDkJv+w8RY/WJybOqyqkRn5OvMOHUTJ6ApNRHtSFjgHD97BmM6nyNw/\n/icnEUwFvuG6lJG6NI+kDl+MpukakzEs5mXYb5eRE6IgZh3BSZasb4p83oJFg9Lo\neootK1VIiYiJsgPGXuSYgmQ=\n-----END PRIVATE KEY-----\n"
};

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function run() {
  const workspaces = await db.collection("workspaces").get();
  for (const ws of workspaces.docs) {
    const jobs = await ws.ref.collection("publishingJobs").where("status", "==", "failed").get();
    jobs.forEach(doc => {
      console.log(`Failed job in workspace ${ws.id}:`, doc.data());
    });
  }
  process.exit(0);
}
run();
