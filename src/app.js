const express = require('express');
const path = require('path');
const session = require('express-session');
const connectPgSimple = require('connect-pg-simple');
const passport = require('./config/passport');
const flash = require('express-flash');
const authRoutes = require('./routes/authRoutes');
const fileRoutes = require('./routes/fileRoutes');
const folderRoutes = require('./routes/folderRoutes');
const accountRoutes = require('./routes/accountRoutes');
const shareRoutes = require('./routes/shareRoutes');

const PgStore = connectPgSimple(session);
const app = express();

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new PgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === 'production',
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use(authRoutes);
app.use(fileRoutes);
app.use(folderRoutes);
app.use(accountRoutes);
app.use(shareRoutes);

app.get('/api/test', (_req, res) => {
  res.json({ message: 'API is working!' });
});

app.get('/', (_req, res) => {
  res.redirect('/login');
});

app.use((req, res) => {
  if (req.isAuthenticated()) {
    req.flash('error', `Page not found: ${req.path}`);
    return res.redirect('/dashboard');
  }
  res.redirect('/login');
});

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

module.exports = app;
