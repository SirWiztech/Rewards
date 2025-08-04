const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: String,
  reward: Number,
  frequency: String,
  description: String,
  taskId: String,
  image: String,
  link: String, // ✅ New field
});

module.exports = mongoose.model('Task', taskSchema);
