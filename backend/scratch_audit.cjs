const admin = require('firebase-admin');
const serviceAccount = require('c:\\Users\\umar hayat\\Downloads\\social-publisher027-firebase-adminsdk-fbsvc-c04daf5b2f.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function run() {
  try {
    const wsRef = db.collection('workspaces').doc('ws_xazCJJERDxg9PguK259HZAQBI882');
    
    // Get the latest post
    const postsSnap = await wsRef.collection('posts')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
      
    if (postsSnap.empty) {
      console.log("No posts found.");
      return;
    }
    
    const post = postsSnap.docs[0].data();
    console.log("LATEST POST:", post);
    
    // Get jobs for this post
    const jobsSnap = await wsRef.collection('publishing_jobs')
      .where('postId', '==', post.id)
      .get();
      
    console.log(`\nFound ${jobsSnap.size} jobs for this post:`);
    jobsSnap.forEach(doc => console.log(doc.data()));
    
    // Get audit events for this post
    const auditSnap = await wsRef.collection('audit_events')
      .where('postId', '==', post.id)
      .orderBy('timestamp', 'asc')
      .get();
      
    console.log(`\nFound ${auditSnap.size} audit events for this post:`);
    auditSnap.forEach(doc => console.log(doc.data()));

  } catch (err) {
    console.error(err);
  }
}

run();
