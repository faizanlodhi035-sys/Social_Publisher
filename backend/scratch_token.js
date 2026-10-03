const admin = require('firebase-admin');
const fetch = require('node-fetch');

const serviceAccount = require('c:\\Users\\umar hayat\\Downloads\\social-publisher027-firebase-adminsdk-fbsvc-c04daf5b2f.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function run() {
  try {
    // We just need ANY valid user uid. Let's create a test user or use an existing one.
    const uid = 'test_dev_user_123';
    
    // Generate a custom token
    const customToken = await admin.auth().createCustomToken(uid);
    
    // Exchange for an ID token
    const apiKey = 'TODO'; // Wait, I need the Web API Key
    
    console.log("Custom token:", customToken);
  } catch (err) {
    console.error(err);
  }
}
run();
