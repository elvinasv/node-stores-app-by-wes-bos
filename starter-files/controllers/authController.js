const passport = require("passport");
const crypto = require("crypto");
const mongoose = require("mongoose");
const promisify = require("es6-promisify");
const User = mongoose.model("User");
const mail = require("../handlers/mail");

exports.login = passport.authenticate("local", {
  failureRedirect: "/login",
  failureFlash: "Failed login!",
  successRedirect: "/",
  successFlash: "Successfully logged in!",
});

exports.logout = (req, res) => {
  req.logout();
  req.flash("success", "You are now logged out!");
  res.redirect("/");
};

exports.isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    next(); // They are logged in!
    return;
  }

  req.flash("error", "Oops, you must be logged in to do that!");
  res.redirect("/login");
};

exports.forgot = async (req, res) => {
  // 1. See if a user with that email exists
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    // NOTE: for security reasons might say "Reset email has been sent" to prevent scraping
    req.flash("error", "No account with the email exists");
    return res.redirect("/login");
  }

  // 2. Set reset token and expiry on their account
  user.resetPasswordToken = crypto.randomBytes(20).toString("hex");
  user.resetPasswordExpires = Date.now() + 3600000; // 1h from now
  await user.save();

  // 3. Send them an email with the token
  const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;

  await mail.send({
    user: user,
    subject: "Password reset",
    resetURL,
    filename: "password-reset",
  });

  req.flash("success", "You have been emailed a password reset link.");
  // 4. Redirect to login page
  res.redirect("/login");
};

exports.reset = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }, // Greater than right now
  });

  if (!user) {
    req.flash("error", "Password reset token is invalid or has expired!");
    res.redirect("/login");
  }
  // if there's a user with token, show the reset form
  res.render("reset", { title: "Reset your Password!" });
};

exports.confirmedPasswords = (req, res, next) => {
  const hasEqualPasswords =
    req.body["password"] === req.body["password-confirm"];

  if (hasEqualPasswords) {
    next();
    return;
  }
  req.flash("error", "Passwords do not match");
  res.redirect("back");
};

exports.update = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() }, // Greater than right now
  });

  if (!user) {
    req.flash("error", "Password reset token is invalid or has expired!");
    res.redirect("/login");
  }

  // Update the password
  const setPassword = promisify(user.setPassword, user);
  await setPassword(req.body.password);

  // Delete password token
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  const updatedUser = await user.save();
  await req.login(updatedUser);

  req.flash("success", "Done! Your password has been updated!");
  res.redirect("/");
};
