const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const teacherSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    username: String,
    degree: String,
    institute: String,
    contact: String,
    profession: String,
    preferredSubject: String,
    address: String,
    postalCode: String,
    province: String,
    profileImage: {
        type: String
    },
    policeReport: String,
    availability: {
        type: [
            {
                day: String,
                from: String,
                to: String
            }
        ]
    },
    requests: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Requests'
        }
    ],
    new: {
        type: Boolean,
        default: true
    },
    resetTokenTimestamp: String,
    resetToken: String
});



teacherSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model('Teacher', teacherSchema);