const mongoose = require("mongoose");
var autoIncrement = require('mongoose-auto-increment'); // 2. require mongoose-auto-increment

const userSchema = new mongoose.Schema({
  name: { type: String, default: null },
  email: { type: String, unique: true },
  password: { type: String },
  token: { type: String },
});

autoIncrement.initialize(mongoose.connection);
userSchema.plugin(autoIncrement.plugin, 'user');
module.exports = mongoose.model('user', userSchema);
