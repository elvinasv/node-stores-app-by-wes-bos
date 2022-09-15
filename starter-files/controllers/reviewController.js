const mongoose = require("mongoose");
const Review = mongoose.model("Review");
const promisify = require("es6-promisify");
const { json } = require("express");
const { editStore } = require("./storeController");

exports.addReview = async (req, res) => {
  req.body.author = req.user._id;
  req.body.store = req.params.id;

  const newReview = new Review(req.body);
  await newReview.save();
  req.flash("success", "Review saved!");
  res.redirect("back");
};
