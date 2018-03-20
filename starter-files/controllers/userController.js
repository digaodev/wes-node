const mongoose = require('mongoose');

exports.loginForm = (req, res) => {
  res.render('login');
};

exports.validateRegister = (req, res, next) => {
  req.sanitizeBody('name');
  req.checkBody('name', 'Please inform a valid name').notEmpty();

  req.sanitizeBody('email').normalizeEmail({
    remove_dots: false,
    remove_extension: false,
    gmail_remove_subaddress: false
  });
  req.checkBody('email', 'Please inform a valid email').isEmail();

  req.checkBody('password', 'Please inform a valid password').notEmpty();
  req
    .checkBody(
      'confirm-password',
      'Please inform a valid password confirmation'
    )
    .notEmpty();
  req
    .checkBody('confirm-password', 'Passwords do not match')
    .equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    req.flash('error', errors.map(err => err.msg));
    res.render('register', {
      title: 'Register',
      body: req.body,
      flashes: req.flash()
    });
    return;
  }
  next();
};

exports.registerForm = (req, res) => {
  res.render('register');
};
