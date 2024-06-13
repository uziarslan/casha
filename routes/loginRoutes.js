const express = require('express');
const wrapAsync = require('../utils/wrapAsync');
const mongoose = require('mongoose');
const Teacher = mongoose.model('Teacher');
const Student = mongoose.model('Student');
const Avatar = mongoose.model('Avatar');
const passport = require('passport');
const router = express();

router.get('/signup/teacher', (req, res) => {
    res.render('./homepages/teachersignup')
});
router.get('/signuphome', (req, res) => {
    res.render('./homepages/signuphome')
});


router.get('/signup/student', (req, res) => {
    res.render('./homepages/studentsignup')
});

router.get('/login', (req, res) => {
    res.render('./homepages/login')
});

// POST login route
router.post('/login', (req, res, next) => {
    passport.authenticate(['teacher', 'student'], (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            req.flash('error', 'Invalid Email or Password');
            return res.redirect('/login');
        }
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
            if (user instanceof Teacher) {
                return res.redirect('/teacher/dashboard');
            } else if (user instanceof Student) {
                return res.redirect('/student/dashboard');
            }
        });
    })(req, res, next);
});


router.post('/teacher', wrapAsync(async (req, res, next) => {
    const {
        firstName,
        lastName,
        username,
        password,
        degree,
        institute,
        contact,
        profession,
        preferredSubject,
        address,
        postalCode,
        province,
        policeReport,
        monday,
        tuesday,
        wednesday,
        thursday,
        friday,
        saturday,
    } = req.body;
    const foundTeacher = await Teacher.find({ username });
    const foundStudent = await Student.find({ username });

    if (foundStudent.length) {
        req.flash('error', 'Email is already in use. Try different one instead!');
        return res.redirect('/signup/teacher');
    }
    if (foundTeacher.length) {
        req.flash('error', 'Email is already in use. Try different one instead!');
        return res.redirect('/signup/teacher');
    }
    const days = [
        { day: 'Monday', from: monday?.from, to: monday?.to },
        { day: 'Tuesday', from: tuesday?.from, to: tuesday?.to },
        { day: 'Wednesday', from: wednesday?.from, to: wednesday?.to },
        { day: 'Thursday', from: thursday?.from, to: thursday?.to },
        { day: 'Friday', from: friday?.from, to: friday?.to },
        { day: 'Saturday', from: saturday?.from, to: saturday?.to },
    ];
    const teacher = new Teacher({
        firstName,
        lastName,
        username,
        degree,
        institute,
        contact,
        profession,
        preferredSubject,
        address,
        postalCode,
        province,
        policeReport,

        availability: days.map(day => ({
            day: day.day,
            from: day.from ?? null,
            to: day.to ?? null,
        }))
    });
    const registerTeacher = await Teacher.register(teacher, password, function (err, newTeacher) {
        if (err) {
            next(err)
        }
        req.logIn(newTeacher, () => {
            res.redirect('/teacher/dashboard');
        })
    })
}));

router.post('/student', wrapAsync(async (req, res, next) => {
    const { username, password } = req.body;
    const foundTeacher = await Teacher.find({ username });
    const foundStudent = await Student.find({ username });

    if (foundStudent.length) {
        req.flash('error', 'Email is already in use. Try different one instead!');
        return res.redirect('/signup/student');
    }
    if (foundTeacher.length) {
        req.flash('error', 'Email is already in use. Try different one instead!');
        return res.redirect('/signup/student');
    }
    const student = new Student({ ...req.body });
    const registerStudent = await Student.register(student, password, function (err, newStudent) {
        if (err) {
            next(err)
        }
        req.logIn(newStudent, () => {
            res.redirect('/student/dashboard')
        })
    })
}));

router.put('/student/:studentId', wrapAsync(async (req, res, next) => {
    const { username, password } = req.body;
    const { studentId } = req.params;
    const student = await Student.findById(studentId);
    if (username && username !== student.username) {
        const existingStudent = await Student.findOne({ username });
        if (existingStudent) {
            req.flash('error', 'Email is already registered')
            return res.redirect('/student/profile');
        }
        student.username = username;
    }
    student.firstName = req.body.firstName;
    student.lastName = req.body.lastName;
    student.institute = req.body.institute;
    student.grade = req.body.grade;
    student.profileImage = req.body.profileImage;
    await student.save();
    if (password) {
        student.setPassword(password, () => {
            student.save();
            req.logIn(student, () => {
                req.flash('success', `"Success! Your profile details have been successfully updated. Please review the changes to ensure all information is accurate."`)
                res.redirect('/student/profile');
            });
        });
    } else {
        req.flash('success', `"Success! Your profile details have been successfully updated. Please review the changes to ensure all information is accurate."`)
        res.redirect('/student/profile');
    }
}));

router.put('/teacher/:teacherId', wrapAsync(async (req, res, next) => {
    const { username, password } = req.body;
    const { teacherId } = req.params;
    const teacher = await Teacher.findById(teacherId);

    // Update username if it's provided and differs from the current one
    if (username && username !== teacher.username) {
        const existingTeacher = await Teacher.findOne({ username });
        if (existingTeacher) {
            req.flash('error', 'Teacher is already registered.');
            return res.redirect('/teacher/profile');
        }
        teacher.username = username;
    }

    // Update basic teacher information
    teacher.firstName = req.body.firstName;
    teacher.lastName = req.body.lastName;
    teacher.degree = req.body.degree;
    teacher.institute = req.body.institute;
    teacher.contact = req.body.contact;
    teacher.profession = req.body.profession;
    teacher.preferredSubject = req.body.preferredSubject;
    teacher.address = req.body.address;
    teacher.postalCode = req.body.postalCode;
    teacher.province = req.body.province;
    teacher.policeReport = req.body.policeReport;

    // Update availability for each day regardless of null values
    const days = [
        { day: 'Monday', from: req.body.monday?.from, to: req.body.monday?.to },
        { day: 'Tuesday', from: req.body.tuesday?.from, to: req.body.tuesday?.to },
        { day: 'Wednesday', from: req.body.wednesday?.from, to: req.body.wednesday?.to },
        { day: 'Thursday', from: req.body.thursday?.from, to: req.body.thursday?.to },
        { day: 'Friday', from: req.body.friday?.from, to: req.body.friday?.to },
        { day: 'Saturday', from: req.body.saturday?.from, to: req.body.saturday?.to },
    ];

    // Saving all days, whether they have defined times or not
    teacher.availability = days.map(day => ({
        day: day.day,
        from: day.from ?? null,
        to: day.to ?? null,
    }));

    teacher.profileImage = req.body.profileImage;

    // Save changes and handle password update
    await teacher.save();
    if (password) {
        teacher.setPassword(password, () => {
            teacher.save();
            req.logIn(teacher, () => {
                req.flash('success', 'Success! Your profile details have been successfully updated. Please review the changes to ensure all information is accurate.');
                res.redirect('/teacher/profile');
            });
        });
    } else {
        req.flash('success', 'Success! Your profile details have been successfully updated. Please review the changes to ensure all information is accurate.');
        res.redirect('/teacher/profile');
    }
}));



router.get('/signout', (req, res) => {
    req.logOut(() => {
        res.redirect('/')
    })
})

module.exports = router