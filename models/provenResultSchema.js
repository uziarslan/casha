const mongoose = require('mongoose');

const provenResultSchema = new mongoose.Schema({
    filename: String,
    path: String
});

module.exports = mongoose.model('provenResult', provenResultSchema);