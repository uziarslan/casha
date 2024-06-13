const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const wrapAsync = require('../utils/wrapAsync');
const Teacher = mongoose.model('Teacher');
const Student = mongoose.model('Student');
const Request = mongoose.model('Request');
const provenResult = mongoose.model('provenResult');
const Quote = mongoose.model('Quotes');
const Avatar = mongoose.model('Avatar');
const router = express();
const mailgun = require('mailgun-js');
const mg = mailgun({ apiKey: process.env.MAILGUN_API_KEY || 'ea66ae5912d4a246bc57037bda2f8837-ee16bf1a-b9ecd26a', domain: process.env.DOMAIN || 'mg.cashaedu.com' });
const { isLoggedIn, isTeacher, isStudent } = require('../middlewares');



// Functions
function generateRandomToken(length) {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(length, (err, buffer) => {
            if (err) {
                reject(err);
            } else {
                const token = buffer.toString('hex');
                resolve(token);
            }
        });
    });
}

const tokenLength = 32;



router.get('/forget/password', wrapAsync(async (req, res) => {
    res.render('./homepages/reset');
}));

router.get('/reset/password/:id', wrapAsync(async (req, res) => {
    const { id } = req.params;
    const { token, timestamp } = req.query;
    const teacher = await Teacher.findById(id);
    const student = await Student.findById(id);
    const user = teacher ? teacher : student;
    const currentTime = Date.now();
    const tokenExpirationTime = parseInt(timestamp) + (15 * 60 * 1000); // 15 minutes in milliseconds
    if (!user) {
        req.flash('error', 'Something went wrong please try again!');
        return res.redirect('/forget/password');
    }
    if (user.resetToken !== token || user.resetTokenTimestamp !== timestamp) {
        return res.render('./homepages/reset_failed');
    }
    if (currentTime > tokenExpirationTime) {
        return res.render('./homepages/reset_failed'); // Token has expired, show an error page
    }
    res.render('./homepages/password', { user });
}));

router.post('/reset/:id', wrapAsync(async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
    const teacher = await Teacher.findById(id);
    const student = await Student.findById(id);
    const user = teacher ? teacher : student;
    if (!user) {
        req.flash('error', 'Something went wrong please try again!');
        return res.redirect('/forget/password');
    }
    user.setPassword(password, async () => {
        await user.save();
        req.flash('success', 'Your password has been updated');
        res.redirect('/login');
    });
}))

router.post('/reset', wrapAsync(async (req, res) => {
    const { username } = req.body;
    const teacher = await Teacher.findOne({ username });
    const student = await Student.findOne({ username });
    const user = teacher ? teacher : student;
    const token = await generateRandomToken(tokenLength)
    const tokenTimestamp = Date.now()

    if (!teacher && !student) {
        req.flash('error', 'Unable to find this registered email');
        return res.redirect('/forget/password')
    }
    const data = {
        from: 'Casha <info@cashaedu.com>',
        to: `${username}`,
        subject: 'Password Reset',
        template: "reset password",
        'h:X-Mailgun-Variables': JSON.stringify({
            href: `https://www.cashaedu.com/reset/password/${user._id}?token=${token}&timestamp=${tokenTimestamp}`,
        })
    };
    user.resetTokenTimestamp = tokenTimestamp;
    user.resetToken = token;
    await user.save();
    mg.messages().send(data);
    req.flash('success', `Email has been sent to ${username}`);
    res.redirect('/forget/password');
}));

router.get('/', async (req, res) => {
    const images = await provenResult.find({});
    const quotes = await Quote.find({});
    res.render('./homepages/index', { images, quotes });
});

router.get('/teacher/dashboard', isLoggedIn, isTeacher, wrapAsync(async (req, res) => {
    const { studentName, results } = req.query;
    let requests = []
    if (studentName) {
        const requestsArr = await Request.find({ teacher: req.user._id, requestStatus: 'approved' }).populate({
            path: 'requestStudent',
            model: 'Student',
            match: { firstName: studentName }
        })
        requests = requestsArr.filter(r => r.requestStudent !== null)
    } else if (!studentName) {
        const requestsArr = await Request.find({ teacher: req.user._id, requestStatus: 'approved' }).populate('requestStudent')
        requests = requestsArr
    } else {
        requests = []
    }
    res.render('./dashboard/mystudents', { user: req.user, requests });
}));



router.get('/teacher/requests', isLoggedIn, isTeacher, wrapAsync(async (req, res) => {
    const today = new Date();
    const options = { weekday: 'long' };
    const dayName = today.toLocaleDateString('en-US', options);
    const { studentName } = req.query;
    let students = [];
    if (studentName) {
        const requests = await Request.find({ teacher: req.user._id, requestStatus: 'pending' }).populate({
            path: 'requestStudent',
            model: 'Student',
            match: { firstName: studentName }
        });
        students = requests.filter(r => r.requestStudent !== null)
    } else if (!studentName) {
        const requests = await Request.find({ teacher: req.user._id, requestStatus: 'pending' }).populate('requestStudent');
        students = requests
    } else {
        students = []
    }
    res.render('./dashboard/requests', { user: req.user, students, dayName, studentName });
}));



router.get('/teacher/profile', isLoggedIn, isTeacher, async (req, res) => {
    const avatars = await Avatar.find({});
    res.render('./dashboard/profile', { user: req.user, avatars })
});

router.get('/student/dashboard', isLoggedIn, isStudent, wrapAsync(async (req, res) => {
    const requests = await Request.find({ requestStudent: req.user._id }).populate('teacher')
    res.render('./dashboard/myteachers', { user: req.user, requests });
}));

router.get('/student/findclass', isLoggedIn, isStudent, async (req, res) => {
    const { topic, results } = req.query;
    const { user } = req;
    const today = new Date();
    const options = { weekday: 'long' };
    const dayName = today.toLocaleDateString('en-US', options);
    let teachers = []
    if (topic) {
        const teacherArr = await Teacher.find({ preferredSubject: topic }).populate({
            path: 'requests',
            model: 'Request'
        })
        teachers = teacherArr
    } else {
        const teacherArr = await Teacher.find({ new: false }).populate({
            path: 'requests',
            model: 'Request',
            match: { requestStudent: req.user._id }
        })
        teachers = teacherArr
    }
    const requests = await Teacher.find({}).populate({
        path: 'requests',
        model: 'Request'
    });
    res.render('./dashboard/findclass', { topic, teachers, user, dayName, requests });
});

router.get('/student/profile', isLoggedIn, isStudent, async (req, res) => {
    const avatars = await Avatar.find({});
    res.render('./dashboard/studentprofile', { user: req.user, avatars });
});


router.post('/student/:studentId/teacher/:teacherId', wrapAsync(async (req, res) => {
    const { teacherId, studentId } = req.params;
    const { topic, requestTime } = req.body;
    const teacher = await Teacher.findById(teacherId);
    const student = await Student.findById(studentId);
    const requestObj = {
        requestStudent: student._id,
        requestStatus: 'pending',
        requestTopic: topic,
        requestTime,
        teacher: teacher._id
    }
    const request = new Request(requestObj);
    teacher.requests.push(request._id);
    student.requests.push(request._id);
    await teacher.save();
    await student.save();
    await request.save();
    req.flash('success', 'Your request to join the class has been successfully submitted to the respective teacher. Please hold on while they review your application.');
    res.redirect('/student/findclass');
}));

router.get('/accept/:teacherId/:request_Id', wrapAsync(async (req, res) => {
    const { teacherId, request_Id } = req.params;
    const teacher = await Teacher.findById(teacherId);
    const request = await Request.findById(request_Id);
    const matchingRequests = await Request.find({
        teacher: teacherId,
        requestTopic: { $regex: new RegExp(request.requestTopic, 'i') },
        requestTime: request.requestTime
    });

    if (matchingRequests.length > 1) {
        // Update the matched requests with the meeting data
        for (let i = 0; i < matchingRequests.length; i++) {
            matchingRequests[i].meetingId = request._id;
            matchingRequests[i].startUrl = `/teacher/${request._id}`;
            matchingRequests[i].joinUrl = `/student/${request._id}`;
            matchingRequests[i].requestStatus = 'approved';
            await matchingRequests[i].save();
            var requestId = matchingRequests[i]._id;
            if (!teacher.requests.includes(requestId)) {
                teacher.requests.push(requestId);
            }
        }
    } else {
        // No matching requests, just update the single request
        request.meetingId = request._id;
        request.startUrl = `/teacher/${request._id}`;
        request.joinUrl = `/student/${request._id}`;
        request.requestStatus = 'approved';
        await request.save();
        var requestId = request._id;
        if (!teacher.requests.includes(requestId)) {
            teacher.requests.push(requestId);
        }
    }

    await request.save();
    await teacher.save();
    req.flash('success', `Thank you for reviewing the class join request. You have successfully accepted the student's request to join your class.`);
    return res.redirect('/teacher/requests');
}));


router.get('/teacher/:requestId', wrapAsync(async (req, res) => {
    const { requestId } = req.params;
    const request = await Request.findById(requestId).populate('teacher');
    // res.send(request)
    res.render('./dashboard/jitsiscreen', { request, currentUserEmail: req.user.username });
}));


router.get('/student/:requestId', wrapAsync(async (req, res) => {
    const { requestId } = req.params;
    const request = await Request.findById(requestId).populate('requestStudent');
    res.render('./dashboard/jitsiscreen', { request, currentUserEmail: req.user.username });
}));


router.get('/decline/:teacherId/:studentId/:requestId', wrapAsync(async (req, res) => {
    const { studentId, teacherId, requestId } = req.params;
    const request = await Request.findByIdAndDelete(requestId)
    await Teacher.findByIdAndUpdate(teacherId, { $pull: { requests: request._id } });
    await Student.findByIdAndUpdate(studentId, { $pull: { requests: request._id } });
    req.flash('success', `Student's request has been successfully declined.`)
    res.redirect('/teacher/requests')
}));

router.get('/delete/:teacherId/:studentId/:requestId', wrapAsync(async (req, res) => {
    const { teacherId, studentId, requestId } = req.params;
    const request = await Request.findByIdAndDelete(requestId)
    await Teacher.findByIdAndUpdate(teacherId, { $pull: { requests: request._id } });
    await Student.findByIdAndUpdate(studentId, { $pull: { requests: request._id } });
    req.flash('success', `You have successfully opted out of the accepted class.`)
    res.redirect('/student/dashboard')
}));

router.get('/pending/:studentId/:requestId', wrapAsync(async (req, res) => {
    const { studentId, requestId } = req.params;
    const request = await Request.findOneAndUpdate({ requestStudent: studentId }, { requestStatus: 'pending' }, { new: true })
    await Teacher.findByIdAndUpdate(req.user._id, { $pull: { requests: request._id } })
    req.flash('success', `Student's request is successfully updated to 'pending' status. `)
    res.redirect('/teacher/dashboard');
}));

router.get('/dele/:requestId', wrapAsync(async (req, res) => {
    const { requestId } = req.params;
    await Request.findByIdAndDelete(requestId);
    req.flash('success', 'Student request has been successfully deleted.');
    res.redirect('/teacher/dashboard');
}))



module.exports = router