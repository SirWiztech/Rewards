const router = require("express").Router();
const admin = require("./firebase"); // path to firebase.js
const User = require("./User");

router.post("/google-auth", async (req, res) => {
  const { idToken } = req.body;

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const { name, email, uid, picture } = decoded;

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        fullname: name,
        email,
        googleId: uid,
        profilePicture: picture,
        balance: 0,
      });
      await user.save();
    }

    req.session.userId = user._id;
    res.status(200).json({ message: "User signed in", user });
  } catch (err) {
    console.error("Token verification failed", err);
    res.status(401).json({ message: "Invalid or expired token" });
  }
});

module.exports = router;
