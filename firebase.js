const admin = require("firebase-admin");
const serviceAccount = require("./firebase-service-account.json"); // your Firebase admin SDK key

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
