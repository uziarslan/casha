const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
    requestStudent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
    },
    requestStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected']
    },
    requestTopic: {
        type: String
    },
    requestTime: {
        type: String
    },
    meetingId: {
        type: String
    },
    startUrl: {
        type: String
    },
    joinUrl: {
        type: String
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher'
    }
});

module.exports = mongoose.model('Request', requestSchema);