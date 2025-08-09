// server.js (updated)
require("dotenv").config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const session = require("express-session");
const multer = require("multer");
const fs = require("fs");
const User = require("./models/User");
const router = express.Router();
const Task = require("./models/task");
const admin = require("./firebase");
const cron = require("node-cron"); // ✅ ADDED: Import the cron library

const app = express();
const PORT = process.env.PORT || 5000;
const PopupContent = require("./models/PopupContent");
fs.mkdirSync(path.join(__dirname, "public/uploads"), { recursive: true });
const Withdrawal = require("./models/Withdrawal");
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/userdb";
const Setting = require("./models/Setting");

mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
app.use("/", router);

app.use(
  session({
    secret: "your-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: false, maxAge: 86400000 },
  })
);

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  next();
});

// Admin middleware
const isAdmin = (req, res, next) => {
  const adminEmail = "ojimabojames@gmail.com";
  if (!req.session.user || req.session.user.email !== adminEmail) {
    return res.status(403).send("Access Denied");
  }
  next();
};

// Middleware to check if the session is active
function checkSession(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
}

// ✅ ADDED: CRON JOB TO RESET DAILY STATS
cron.schedule("0 0 * * *", async () => {
  console.log("⏰ Running daily task reset cron job...");
  try {
    const today = new Date().toISOString().split("T")[0];

    // Find users where today's date is different from the stored date
    const usersToUpdate = await User.find({
      "taskStats.todayDate": { $ne: today },
    });

    for (const user of usersToUpdate) {
      user.taskStats.todaysProfit = 0;
      user.taskStats.taskCount = 0;
      user.taskStats.completedTasks = {}; // Reset completed tasks for the new day
      user.taskStats.todayDate = today;
      await user.save();
    }
    console.log("✅ Daily task stats reset successfully.");
  } catch (error) {
    console.error("❌ Error during daily task reset:", error);
  }
});

// POST: Create New Task (unchanged)
const taskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads/"),
  filename: (req, file, cb) => `${Date.now()}-${file.originalname}`,
});
const taskUpload = multer({ storage: taskStorage });

router.post(
  "/admin/create-task",
  taskUpload.single("image"),
  async (req, res) => {
    const { title, reward, frequency, description, taskId, link } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : "";
    if (!title || !reward || !taskId) {
      return res
        .status(400)
        .json({ message: "All required fields are missing" });
    }
    try {
      const newTask = new Task({
        title,
        reward,
        frequency,
        description,
        taskId,
        image,
        link,
      });
      await newTask.save();
      res.json({ message: "Task created successfully!" });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error creating task", error: err.message });
    }
  }
);

// deleting tasks (unchanged)
router.delete("/admin/delete-task/:id", async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting task", error: err.message });
  }
});

// GET: All Tasks (unchanged)
router.get("/tasks", async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: "Error fetching tasks" });
  }
});

// (Router continues with other routes)
module.exports = router;

// Static routes (unchanged)
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));
app.get("/signup", (req, res) =>
  res.sendFile(path.join(__dirname, "signup.html"))
);
app.get("/signup/:refCode", (req, res) =>
  res.sendFile(path.join(__dirname, "signup.html"))
);
app.get("/login", (req, res) =>
  res.sendFile(path.join(__dirname, "login.html"))
);
app.get("/dashboard", checkSession, (req, res) =>
  res.sendFile(path.join(__dirname, "dashboard.html"))
);
app.get("/task", checkSession, (req, res) =>
  res.sendFile(path.join(__dirname, "task.html"))
);
app.get("/kyc", checkSession, (req, res) =>
  res.sendFile(path.join(__dirname, "kyc.html"))
);
app.get("/settings", checkSession, (req, res) =>
  res.sendFile(path.join(__dirname, "settings.html"))
);
app.get("/referrals", checkSession, (req, res) =>
  res.sendFile(path.join(__dirname, "referrals.html"))
);
app.get("/admin", isAdmin, (req, res) =>
  res.sendFile(path.join(__dirname, "admin.html"))
);
app.get("/withdrawal", (req, res) => {
  if (!req.session.user) return res.redirect("/login");
  res.sendFile(path.join(__dirname, "withdrawal.html"));
});

// Generate referral code (unchanged)
const generateReferralCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

// Register route (unchanged)
app.post("/register", async (req, res) => {
  const {
    fullname,
    email,
    password,
    confirmPassword,
    referralCode: usedReferralCode,
  } = req.body;
  if (!fullname || !email || !password || !confirmPassword)
    return res.status(400).json({ message: "All fields required." });
  if (password !== confirmPassword)
    return res.status(400).json({ message: "Passwords do not match." });

  try {
    const existing = await User.findOne({ email });
    if (existing)
      return res.status(409).json({ message: "Email already registered." });

    const referralCode = generateReferralCode();
    const newUser = await User.create({
      fullname,
      email,
      password,
      referralCode,
      referredBy: usedReferralCode || null,
    });

    if (usedReferralCode) {
      const referrer = await User.findOne({ referralCode: usedReferralCode });
      if (referrer) {
        referrer.referralBonus += 100;
        referrer.referralBalance += 100;
        await referrer.save();
      }
    }

    req.session.user = { id: newUser._id, email: newUser.email };
    res.redirect("/dashboard");
  } catch (err) {
    res.status(500).json({ message: "Error creating user." });
  }
});

// Login route (unchanged)
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email, password });
    if (!user) return res.status(401).send("Invalid credentials");

    if (user.isBlocked) return res.status(403).send("Account is blocked");

    req.session.user = { id: user._id, email: user.email };
    res.redirect("/dashboard");
  } catch (err) {
    res.status(500).send("Server error");
  }
});

// Balance API (unchanged)
app.get("/get-balance", async (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ message: "Not logged in." });
  try {
    const user = await User.findById(req.session.user.id);
    res.json({ balance: user.balance });
  } catch (err) {
    res.status(500).json({ message: "Error retrieving balance." });
  }
});

app.post("/update-balance/:amount", async (req, res) => {
  const amountToAdd = parseFloat(req.params.amount);
  if (!req.session.user)
    return res.status(401).json({ message: "Unauthorized" });

  try {
    const user = await User.findById(req.session.user.id);
    user.balance += amountToAdd;
    await user.save();
    res.json({ message: "Balance updated", newBalance: user.balance });
  } catch (err) {
    res.status(500).json({ message: "Update failed." });
  }
});

// Task execution (once per day) - updated to handle freeze balance
app.post("/do-task/:taskId/:amount", async (req, res) => {
  const { taskId, amount } = req.params;
  const reward = parseFloat(amount);
  const today = new Date().toISOString().split("T")[0];

  if (!req.session.user)
    return res.status(401).json({ message: "Not logged in." });

  try {
    const user = await User.findById(req.session.user.id);
    if (user.isBlocked)
      return res.status(403).json({ message: "Your account is blocked." });

    if (!user.taskStats) {
      user.taskStats = {
        todayDate: today,
        todaysProfit: 0,
        totalProfit: 0,
        taskCount: 0,
        freezeBalance: 0,
        completedTasks: {},
      };
    }

    if (user.taskStats.todayDate !== today) {
      user.taskStats.todayDate = today;
      user.taskStats.todaysProfit = 0;
      user.taskStats.completedTasks = {};
    }

    if (user.taskStats.completedTasks[taskId] === today) {
      return res.status(400).json({ message: "Task already completed today." });
    }

    user.taskStats.todaysProfit += reward;
    user.taskStats.totalProfit += reward;
    user.taskStats.taskCount += 1;
    user.taskStats.completedTasks[taskId] = today;

    // Check if KYC is approved before freezing the balance
    if (user.kycStatus !== 'approved') {
        user.taskStats.freezeBalance += reward;
    } else {
        user.balance += reward;
    }

    await user.save();
    res.json({
      message: "Task completed.",
      stats: user.taskStats,
      newBalance: user.balance,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Task stats (unchanged)
app.get("/get-stats", async (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ message: "Not logged in" });
  try {
    const user = await User.findById(req.session.user.id);
    res.json({ stats: user.taskStats });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// Referral API (unchanged)
app.get("/get-referral-balance", async (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ message: "Not logged in." });
  try {
    const user = await User.findById(req.session.user.id);
    const referredUsers = await User.find({ referredBy: user.referralCode });
    res.json({
      referralCode: user.referralCode,
      referralBalance: user.referralBalance,
      referred: referredUsers.map((u) => ({
        name: u.fullname,
        email: u.email,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: "Could not fetch referral data." });
  }
});

// Withdraw referral balance (unchanged)
app.post("/withdraw-referral-balance", async (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ message: "Unauthorized" });

  try {
    const user = await User.findById(req.session.user.id);
    const transferAmount = user.referralBalance;
    if (transferAmount <= 0)
      return res.status(400).json({ message: "No referral balance." });

    user.balance += transferAmount;
    user.referralBalance = 0;
    await user.save();

    res.json({
      message: "Referral balance transferred.",
      newBalance: user.balance,
    });
  } catch (err) {
    res.status(500).json({ message: "Transfer failed." });
  }
});

// Profile updates (unchanged)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

app.post("/update-profile", upload.single("profilePic"), async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated." });

    const { fullName } = req.body;
    const profilePicPath = req.file ? `/uploads/${req.file.filename}` : null;
    const updateData = {};
    if (fullName) updateData.fullname = fullName;
    if (profilePicPath) updateData.profilePicture = profilePicPath;

    await User.findByIdAndUpdate(userId, updateData);
    res.json({ message: "Profile updated successfully." });
  } catch (err) {
    res.status(500).json({ message: "Failed to update profile." });
  }
});

// ✅ UPDATED: Approve KYC (admin action)
app.post("/admin/approve-kyc", async (req, res) => {
  const { userId } = req.body;
  try {
    // Find the user to update
    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    // Update the KYC status to 'approved'
    user.kycStatus = "approved";

    // ✅ ADDED: Reset freezeBalance to 0 and transfer it to the main balance
    if (user.taskStats && user.taskStats.freezeBalance > 0) {
        user.balance += user.taskStats.freezeBalance;
        user.taskStats.freezeBalance = 0;
    }

    await user.save(); // Save the updated user document

    res.status(200).json({ message: "KYC approved", user });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get user info (unchanged)
app.get("/get-user", async (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ message: "Not logged in" });

  try {
    const user = await User.findById(req.session.user.id);
    res.json({
      fullname: user.fullname,
      profilePicture: user.profilePicture || "/IMAGES/default-user.png",
      referralCode: user.referralCode,
      uid: user._id,
      kycStatus: user.kycStatus || "pending",
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/admin/users", isAdmin, async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Error fetching users" });
  }
});

app.post("/submit-kyc", upload.single("idDocument"), async (req, res) => {
  const { fullName, idType, idNumber } = req.body;
  const idDocument = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const user = await User.findById(req.session.user?.id);
    if (!user) return res.status(401).json({ message: "Not logged in" });

    user.kycData = {
      fullName,
      idType,
      idNumber,
      idDocument,
      submittedAt: new Date(),
    };
    user.kycStatus = "pending";
    await user.save();
    res.redirect("/dashboard");
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to submit KYC", error: err.message });
  }
});

app.get("/admin/kyc-submissions", isAdmin, async (req, res) => {
  try {
    const pendingUsers = await User.find({ kycStatus: "pending" });
    res.json(
      pendingUsers.map((user) => ({
        id: user._id,
        email: user.email,
        fullname: user.kycData?.fullName || user.fullname,
        idType: user.kycData?.idType,
        idNumber: user.kycData?.idNumber,
        idDocument: user.kycData?.idDocument,
        submittedAt: user.kycData?.submittedAt,
      }))
    );
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch KYC submissions" });
  }
});

app.post("/admin/block-user", isAdmin, async (req, res) => {
  const { userId } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { isBlocked: true },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User blocked successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error blocking user" });
  }
});

// Submit withdrawal request (unchanged)
app.post("/withdraw", async (req, res) => {
  let { bank, accountName, accountNumber, amount } = req.body;
  amount = parseFloat(amount);
  if (!req.session.user)
    return res.status(401).json({ message: "Unauthorized" });

  try {
    const user = await User.findById(req.session.user.id);
    if (user.kycStatus !== 'approved') {
        return res.status(403).json({ message: "KYC must be approved before you can withdraw." });
    }

    if (user.balance < amount) {
      return res.status(400).json({
        message: `Insufficient balance. You only have ₦${user.balance}.`,
      });
    }

    user.balance -= amount;
    await user.save();

    const receiptId = `RCPT-${Date.now().toString().slice(-6)}`;
    const newWithdrawal = await Withdrawal.create({
      userId: user._id,
      bank,
      accountName,
      accountNumber,
      amount,
      receipt: receiptId,
      status: "pending",
    });

    res.status(200).json({
      message: "Withdrawal request submitted",
      withdrawal: newWithdrawal,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to request withdrawal", error: err.message });
  }
});

// Admin withdrawal routes (unchanged)
app.get("/admin/withdrawals", isAdmin, async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ status: "pending" }).sort({
      createdAt: -1,
    });
    res.json(withdrawals);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch withdrawals" });
  }
});

app.post("/admin/withdrawals/approve", isAdmin, async (req, res) => {
  const { withdrawalId } = req.body;

  try {
    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal || withdrawal.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Invalid or already processed request" });
    }

    const user = await User.findById(withdrawal.userId);
    if (!user || user.balance < withdrawal.amount) {
      return res.status(400).json({ message: "Insufficient user balance" });
    }

    user.balance -= withdrawal.amount;
    await user.save();

    withdrawal.status = "approved";
    await withdrawal.save();

    res.json({ message: "Withdrawal approved" });
  } catch (err) {
    res.status(500).json({ message: "Failed to approve withdrawal" });
  }
});

app.post("/admin/withdrawals/reject", isAdmin, async (req, res) => {
  const { withdrawalId } = req.body;

  try {
    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal || withdrawal.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Invalid or already processed request" });
    }

    withdrawal.status = "rejected";
    await withdrawal.save();

    const user = await User.findById(withdrawal.userId);
    if (user) {
      user.balance += withdrawal.amount;
      await user.save();
    }

    res.json({ message: "Withdrawal rejected and amount returned to user" });
  } catch (err) {
    console.error("Reject withdrawal error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/my-withdrawals", async (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ message: "Not logged in" });

  try {
    const withdrawals = await Withdrawal.find({ userId: req.session.user.id });
    res.json(withdrawals);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch your withdrawals" });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

app.get("/user/profile", isAuthenticated, async (req, res) => {
  const user = await User.findById(req.session.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({
    fullname: user.fullname,
    balance: user.balance,
    totalWithdrawn: user.totalWithdrawn || 0,
    kycStatus: user.kycStatus,
  });
});

app.get("/user/balance", async (req, res) => {
  if (!req.session.user || !req.session.user.id) {
    return res.status(401).json({ message: "Not logged in" });
  }

  try {
    const user = await User.findById(req.session.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ balance: user.balance });
  } catch (err) {
    res.status(500).json({ message: "Error retrieving balance" });
  }
});

// Admin settings (unchanged)
app.get("/admin/withdrawal-status", isAdmin, async (req, res) => {
  const setting = await Setting.findOne({ key: "withdrawalEnabled" });
  res.json({ enabled: setting ? setting.value : false });
});

app.post("/admin/withdrawal-status", isAdmin, async (req, res) => {
  const { enabled } = req.body;
  let setting = await Setting.findOne({ key: "withdrawalEnabled" });

  if (setting) {
    setting.value = enabled;
  } else {
    setting = new Setting({ key: "withdrawalEnabled", value: enabled });
  }

  await setting.save();
  res.json({ enabled: setting.value });
});

function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

app.post("/admin/approve-withdrawal", isAdmin, async (req, res) => {
  const { withdrawalId, amount, userId } = req.body;
  await Withdrawal.findByIdAndUpdate(withdrawalId, { status: "approved" });
  await User.findByIdAndUpdate(userId, { $inc: { balance: -amount } });
  res.json({ message: "Withdrawal approved and balance deducted." });
});

router.post("/admin/reject-withdrawal", async (req, res) => {
  const { withdrawalId } = req.body;

  try {
    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) {
      return res.status(404).json({ message: "Withdrawal not found" });
    }

    if (withdrawal.status !== "pending") {
      return res.status(400).json({ message: "Withdrawal already processed" });
    }

    withdrawal.status = "rejected";
    await withdrawal.save();

    const user = await User.findById(withdrawal.userId);
    if (user) {
      user.balance += withdrawal.amount;
      await user.save();
    }

    res.json({ message: "Withdrawal rejected and amount returned to user" });
  } catch (err) {
    console.error("Reject withdrawal error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET popup content (unchanged)
router.get("/admin/popup-content", async (req, res) => {
  const content = await PopupContent.findOne().sort({ updatedAt: -1 });
  res.json(content);
});

// UPDATE popup content (unchanged)
router.post("/admin/popup-content", async (req, res) => {
  const { title, message, imageUrl, buttonText, buttonLink } = req.body;
  let content = await PopupContent.findOne();
  if (!content) content = new PopupContent();

  content.title = title;
  content.message = message;
  content.imageUrl = imageUrl;
  content.buttonText = buttonText;
  content.buttonLink = buttonLink;

  await content.save();
  res.json({ message: "Popup updated successfully" });
});

// Google Auth Endpoint (unchanged)
app.post("/google-auth", async (req, res) => {
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
        referralBalance: 0,
        referralBonus: 0,
        referredBy: null,
        referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      });
      await user.save();
    }

    req.session.user = {
      id: user._id,
      email: user.email,
    };

    res.status(200).json({
      message: "Google Sign-in successful",
      user: {
        fullname: user.fullname,
        email: user.email,
        profilePicture: user.profilePicture,
      },
    });
  } catch (err) {
    console.error("Google Sign-in error:", err);
    res.status(401).json({ message: "Invalid or expired token" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});