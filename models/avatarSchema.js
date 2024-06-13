const mongoose = require('mongoose');

const avatarSchema = new mongoose.Schema({
    filename: String,
    path: String
});

module.exports = mongoose.model('Avatar', avatarSchema);