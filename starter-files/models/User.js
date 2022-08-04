const mongoose = require("mongoose");
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
const md5 = require("md5");
const validator = require("validator");
const mongodbErrorHandler = require("mongoose-mongodb-errors");
const passportLocalMongoose = require("password-local-mongoose");

const userScheme = new Schema({
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, "Invalid email address"],
    required: "Please supply an email address",
  },
  name: {
    type: String,
    require: "Please supply a name",
    trim: true,
  },
});

userScheme.plugin(passportLocalMongoose, { usernameField: "email" });
userScheme.plugin(mongodbErrorHandler);

module.exports = mongoose.model("User", userSchema);
