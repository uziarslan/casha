require('dotenv').config();
require('./models/adminSchema');
require('./models/teacherSchema');
require('./models/studentSchema');
require('./models/requestSchema');
require('./models/provenResultSchema');
require('./models/quotesSchema');
require('./models/avatarSchema');
const express = require('express');
const app = express();
const ejsMate = require('ejs-mate');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const mongoose = require('mongoose');
const Teacher = mongoose.model('Teacher');
const Student = mongoose.model('Student');
const Admin = mongoose.model('Admin');
const MongoDBStore = require('connect-mongo');
const passport = require('passport');
const localStrategy = require('passport-local');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const homepageRoutes = require('./routes/homepageRoutes');
const loginRoutes = require('./routes/loginRoutes');
const adminRoutes = require('./routes/adminRoutes');
const ExpressError = require('./utils/ExpressError');


// Varibales
const PORT = process.env.PORT || 3000;
 const mongoURi = process.env.MONGO_URI || 'mongodb+srv://Casha:Casha@serverlessinstance0.ifhh3qh.mongodb.net/?retryWrites=true&w=majority';

 //   const mongoURi = "mongodb://0.0.0.0:27017/Casha";






const secret = 'thisisnotagoodsecret';
const store = new MongoDBStore({
    mongoUrl: mongoURi,
    secret,
    touchAfter: 24 * 60 * 60
});
const sessionConfig = {
    store,
    secret,
    name: "session",
    resave: false,
    saveUninitialized: false
};



// Setting up the app
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set(path.join(__dirname, 'views'));

// Using the app
app.use(express.static(__dirname + '/public'));
app.use(methodOverride('_method'));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});

// inititalizing Passport
passport.use('admin', new localStrategy(Admin.authenticate()));
passport.use('teacher', new localStrategy(Teacher.authenticate()));
passport.use('student', new localStrategy(Student.authenticate()));
passport.serializeUser((user, done) => {
    if (user instanceof Admin) {
        done(null, { type: 'admin', id: user.id });
    } else if (user instanceof Teacher) {
        done(null, { type: 'teacher', id: user.id });
    } else if (user instanceof Student) {
        done(null, { type: 'student', id: user.id });
    }
});
passport.deserializeUser(async (data, done) => {
    try {
        let user;
        if (data.type === 'admin') {
            user = await Admin.findById(data.id);
        } else if (data.type === 'teacher') {
            user = await Teacher.findById(data.id);
        } else if (data.type === 'student') {
            user = await Student.findById(data.id);
        }
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});


// Route handler
app.use(homepageRoutes);
app.use(loginRoutes);
app.use(adminRoutes);
// app.use(adminRoutes);


// initializing Mongoose
mongoose.connect(mongoURi, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    console.log('Mongoose is connected')
}).catch((e) => {
    console.log(e)
});


// handling the error message
app.all("*", (req, res, next) => {
    next(new ExpressError('Page not found', 404));
});
app.use((err, req, res, next) => {
    const { status = 500 } = err;
    if (!err.message) err.message = "Oh No, Something Went Wrong!";
    res.status(status).render('error', { err });
});

// Listen for the port Number
app.listen(PORT, () => {
    console.log(`App is listening on http://localhost:${PORT}`);
});