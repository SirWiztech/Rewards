const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  key: String,
  value: mongoose.Schema.Types.Mixed
});

module.exports = mongoose.model('Setting', settingSchema);
