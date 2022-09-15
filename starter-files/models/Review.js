const mongoose = require("mongoose");
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

const reviewSchema = new Schema({
  created: {
    type: Date,
    default: Date.now,
  },
  author: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: "You must supply an author!",
  },
  store: {
    type: mongoose.Schema.ObjectId,
    ref: "Store",
    required: "You must supply a store!",
  },
  text: {
    type: String,
    required: "You review must have text!",
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
});

function autoPopulate(next) {
  this.populate("author");
  next();
}

// Hook when find or findOne is used. Then call autoPopulate
reviewSchema.pre("find", autoPopulate);
reviewSchema.pre("findOne", autoPopulate);

module.exports = mongoose.model("Review", reviewSchema);
