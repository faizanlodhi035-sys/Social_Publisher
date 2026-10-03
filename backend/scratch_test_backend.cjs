const admin = require('firebase-admin');

const serviceAccount = require('c:\\Users\\umar hayat\\Downloads\\social-publisher027-firebase-adminsdk-fbsvc-c04daf5b2f.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const API_KEY = "AIzaSyBrfFnYqvm_3DHLtInQOxWECxcYaPWo7sA";

async function testBackend() {
  try {
    const uid = 'system_user'; // A test uid
    
    // 1. Create custom token
    const customToken = await admin.auth().createCustomToken(uid);
    
    // 2. Exchange for ID token using REST API
    const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true })
    });
    
    const authData = await authRes.json();
    if (authData.error) throw new Error(authData.error.message);
    const idToken = authData.idToken;

    console.log("Successfully obtained ID token");

    // 3. Hit the backend
    const payload = {
      caption: "Test caption from script",
      platforms: ["YouTube"],
      mediaUrls: ["https://example.com/video.mp4"]
    };

    const res = await fetch("https://social-publisher-dvec.onrender.com/api/posts/schedule", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
        "x-workspace-id": "ws_xazCJJERDxg9PguK259HZAQBI882"
      },
      body: JSON.stringify(payload)
    });

    console.log("Status:", res.status);
    const data = await res.text();
    console.log("Response:", data);

  } catch (err) {
    console.error(err);
  }
}

testBackend();
