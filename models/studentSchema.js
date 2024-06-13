const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const studentSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    username: String,
    institute: String,
    grade: String,
    requests: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Request'
        }
    ],
    profileImage: {
        type: String
    },
    resetTokenTimestamp: String,
    resetToken: String
});

studentSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model('Student', studentSchema);