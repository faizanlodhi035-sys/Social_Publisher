import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, cert } from "firebase-admin/app";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(
  readFileSync("c:/Users/umar hayat/Downloads/social-publisher027-firebase-adminsdk-fbsvc-c04daf5b2f.json", "utf8")
);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function check() {
  const wsRef = db.collection('workspaces').doc('ws_xazCJJERDxg9PguK259HZAQBI882');
  const accounts = await wsRef.collection('accounts').get();
  
  accounts.forEach(doc => {
    console.log(doc.id, "=>", doc.data());
  });
}

check().catch(console.error);
