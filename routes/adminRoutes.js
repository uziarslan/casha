// Declaring variables
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport')
const provenResult = mongoose.model('provenResult');
const Quote = mongoose.model('Quotes');
const Teacher = mongoose.model('Teacher');
const Student = mongoose.model('Student');
const Admin = mongoose.model('Admin');
const Avatar = mongoose.model('Avatar');
const wrapAsync = require('../utils/wrapAsync');
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage });
const { uploader } = require('cloudinary').v2
const router = express();
const { isLoggedIn, isAdmin } = require('../middlewares');


// Defining routes
router.get('/admin/login', wrapAsync(async (req, res) => {
    res.render('./admin/login');
}));

router.get('/admin/signup', wrapAsync(async (req, res) => {
    const { secret } = req.query;
    if (!secret || secret !== process.env.SECRET) {
        return res.redirect('/')
    }
    res.render('./admin/signup')
}));

router.post('/admin/signup', wrapAsync(async (req, res, next) => {
    const { username, password } = req.body;
    const foundAdmin = await Admin.find({ username });
    if (foundAdmin.length) {
        req.flash('error', 'Admin email alreaady in use. Try again!');
        return res.redirect('/admin/signup');
    }
    const admin = new Admin({ username });
    const registerAdmin = await Admin.register(admin, password, function (err, newAdmin) {
        if (err) {
            next(err)
        }
        req.logIn(newAdmin, () => {
            res.redirect('/admin/proven/results')
        })
    })
}));

router.post('/admin/login', (req, res, next) => {
    passport.authenticate('admin', (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            req.flash('error', 'Invalid Email or Password');
            return res.redirect('/admin/login');
        }
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
            if (user instanceof Admin) {
                req.flash('success', 'Welcome back Admin!');
                return res.redirect('/admin/proven/results');
            }
        });
    })(req, res, next);
});

router.get('/admin/proven/results', isLoggedIn, isAdmin, wrapAsync(async (req, res) => {
    const images = await provenResult.find({});
    res.render('./admin/provenresults', { images });
}));

router.post('/proven/results', isLoggedIn, isAdmin, upload.array('images'), wrapAsync(async (req, res) => {
    const uploadedImages = req.files;
    uploadedImages.map(async ({ filename, path }) => {
        let proven = new provenResult({ filename, path });
        await proven.save()
    })
    req.flash('success', 'Images are uploaded successfully!');
    res.redirect('/admin/proven/results');
}));

router.delete('/image/delete/:id', isLoggedIn, isAdmin, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const image = await provenResult.findById(id);
    // console.log(image)
    await uploader.destroy(image.filename);
    await provenResult.findByIdAndDelete(id);
    req.flash('success', 'The image has been destroyed!');
    res.redirect('/admin/proven/results')
}));

router.get('/admin/avatars', wrapAsync(async (req, res) => {
    const avatars = await Avatar.find({});
    res.render('./admin/avatar', { avatars });
}));

router.post('/avatars', upload.array('images'), wrapAsync(async (req, res) => {
    const uploadedImages = req.files;
    uploadedImages.map(async ({ filename, path }) => {
        let avatar = new Avatar({ filename, path });
        await avatar.save();
    });
    req.flash('success', 'Avatars are uploaded successfully');
    res.redirect('/admin/avatars');
}));

router.delete('/avatars/delete/:id', isLoggedIn, isAdmin, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const image = await Avatar.findById(id);
    await uploader.destroy(image.filename);
    await Avatar.findByIdAndDelete(id);
    req.flash('success', 'The image has been destroyed!');
    res.redirect('/admin/avatars')
}));

router.get('/admin/quotes', isLoggedIn, isAdmin, wrapAsync(async (req, res) => {
    const quotes = await Quote.find({});
    res.render('./admin/quotes', { quotes });
    // res.send(quotes)
}));

router.post('/quote', isLoggedIn, isAdmin, wrapAsync(async (req, res) => {
    const quote = new Quote({ ...req.body });
    await quote.save();
    req.flash('success', 'Quote has been published!');
    res.redirect('/admin/quotes');
}));

router.get('/admin/quote/edit/:id', isLoggedIn, isAdmin, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const quote = await Quote.findById(id);
    res.render('./admin/editquote', { quote });
}));

router.put('/quote/:id', isLoggedIn, isAdmin, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const quote = await Quote.findByIdAndUpdate(id, { ...req.body });
    await quote.save();
    req.flash('success', 'The quote has been updated successfully!');
    res.redirect(`/admin/quotes`);
}));

router.delete('/quote/delete/:id', isLoggedIn, isAdmin, wrapAsync(async (req, res) => {
    const { id } = req.params;
    await Quote.findByIdAndDelete(id);
    req.flash('success', 'Quote has been destroyed successfully!');
    res.redirect('/admin/quotes');
}));

router.get('/admin/teachers', isLoggedIn, isAdmin, wrapAsync(async (req, res) => {
    const newTeachers = await Teacher.find({ new: true });
    const oldTeachers = await Teacher.find({ new: false });
    res.render('./admin/teachers', { newTeachers, oldTeachers })
}));

router.put('/teacher/verify/:id', isLoggedIn, isAdmin, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const teacher = await Teacher.findByIdAndUpdate(id, { new: false });
    await teacher.save();
    req.flash('success', 'Teacher is marked verified successfully!');
    res.redirect('/admin/teachers');
}));

router.put('/teacher/revert/:id', isLoggedIn, isAdmin, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const teacher = await Teacher.findByIdAndUpdate(id, { new: true });
    await teacher.save();
    req.flash('success', 'Decision has been reverted successfully!');
    res.redirect('/admin/teachers');
}));

router.delete('/teacher/delete/:id', isLoggedIn, isAdmin, wrapAsync(async (req, res) => {
    const { id } = req.params;
    await Teacher.findByIdAndDelete(id);
    req.flash('success', 'Teacher profile has been deleted successfully!');
    res.redirect('/admin/teachers');
}));

router.get('/admin/students', isLoggedIn, isAdmin, wrapAsync(async (req, res) => {
    const students = await Student.find({});
    res.render('./admin/students', { students });
}));

router.delete('/student/delete/:id', isLoggedIn, isAdmin, wrapAsync(async (req, res) => {
    const { id } = req.params;
    await Student.findByIdAndDelete(id);
    req.flash('success', 'Student has been deleted successfully!');
    res.redirect('/admin/students');
}));

router.get('/admin/all', isLoggedIn, isAdmin, wrapAsync(async (req, res) => {
    const admins = await Admin.find({});
    res.render('./admin/admin', { admins, user: req.user });
    // res.send(admins)
}));

router.delete('/admin/delete/:id', isLoggedIn, isAdmin, wrapAsync(async (req, res) => {
    const { id } = req.params;
    await Admin.findByIdAndDelete(id);
    req.flash('success', 'Admin has been deleted successfully');
    res.redirect('/admin/all');
}));

router.get('/logout', wrapAsync(async (req, res) => {
    req.logout(() => {
        res.redirect('/')
    });
}));





// exporting all the routes
module.exports = router;