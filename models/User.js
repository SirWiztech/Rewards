const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullname: {
    type: String,
    required: true,
    trim: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },

  password: {
    type: String,
    required: function () {
      return !this.googleId;
    },
  },

  googleId: {
    type: String,
    default: null,
  },

  profilePicture: {
    type: String,
    default: '/IMAGES/default-user.png',
  },

  referralCode: {
    type: String,
    unique: true,
  },

  referredBy: {
    type: String,
    default: null,
  },

  referralBonus: {
    type: Number,
    default: 0,
  },

  referralBalance: {
    type: Number,
    default: 0,
  },

  balance: {
    type: Number,
    default: 0,
  },

  kycStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'blocked'],
    default: 'pending',
  },

  kycData: {
    fullName: String,
    idType: String,
    idNumber: String,
    idDocument: String,
    submittedAt: Date,
  },

  isBlocked: {
    type: Boolean,
    default: false,
  },

  taskStats: {
    todayDate: String,
    todaysProfit: {
      type: Number,
      default: 0,
    },
    totalProfit: {
      type: Number,
      default: 0,
    },
    taskCount: {
      type: Number,
      default: 0,
    },
    freezeBalance: {
      type: Number,
      default: 0,
    },
    completedTasks: {
      type: Map,
      of: String,
      default: () => ({}),
    },
  },
}, { timestamps: true }); // ✅ Optional for tracking user creation/update

module.exports = mongoose.model('User', userSchema);
