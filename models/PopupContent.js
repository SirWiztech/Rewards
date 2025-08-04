    const mongoose = require('mongoose');

const popupContentSchema = new mongoose.Schema({
  title: String,
  message: String,
  imageUrl: String,
  buttonText: String,
  buttonLink: String,
}, { timestamps: true });

module.exports = mongoose.model('PopupContent', popupContentSchema);
