const mongoose = require("mongoose");
const Store = mongoose.model("Store");
const User = mongoose.model("User");
const multer = require("multer");
const jimp = require("jimp");
const uuid = require("uuid");

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith("image/");
    if (isPhoto) {
      next(null, true);
    } else {
      next({ message: "File type isn't allowed" }, false);
    }
  },
};

exports.homePage = (req, res) => {
  console.log(req.name);
  res.render("index");
};

exports.addStore = (req, res) => {
  res.render("editStore", { title: "Add store" });
};

exports.createStore = async (req, res) => {
  req.body.author = req.user._id;
  const store = await new Store(req.body).save();
  req.flash("success", `Store "${store.name}" successfully created!`);

  res.redirect(`/store/${store.slug}`);
};

exports.upload = multer(multerOptions).single("photo");

exports.resize = async (req, res, next) => {
  // check if there's no new file to resize
  if (!req.file) {
    console.log("no file here");
    next();
    return;
  }

  const extension = req.file.mimetype.split("/")["1"];
  req.body.photo = `${uuid.v4()}.${extension}`;
  // resize
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);

  //once we have written the photo to our filesystem, keep going!
  next();
};

exports.getStores = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 6;
  const skip = page * limit - limit; // skip previous stores

  // 1. Query the database for a list of all stores
  const storesPromise = Store.find()
    .skip(skip)
    .limit(limit)
    .sort({ created: "desc" });

  const countPromise = Store.count();

  const [stores, count] = await Promise.all([storesPromise, countPromise]);

  const pages = Math.ceil(count / limit);

  if (!stores.length && skip) {
    req.flash(
      "info",
      `Page ${page} doesn't exist. Redirecting to the last page - ${pages}.`
    );

    return res.redirect(`/stores/page/${pages}`);
  }

  res.render("stores", {
    title: "Stores",
    stores,
    page,
    pages,
    count,
  });
};

exports.getStoreBySlug = async (req, res, next) => {
  const store = await Store.findOne({ slug: req.params.slug }).populate(
    "author reviews"
  );

  if (store) {
    res.render("store", { store, tite: store.name });
  } else {
    return next();
  }
};

const confirmOwner = (store, user) => {
  if (!store.author.equals(user._id)) {
    throw Error("You must own a store in order to edit it!");
  }
};
exports.editStore = async (req, res) => {
  // 1. Find the store given the ID
  const store = await Store.findOne({ _id: req.params.id });
  // 2. Confirm they are the owner of the store
  confirmOwner(store, req.user);
  // 3. Render out the edit form so the user can update their store
  res.render("editStore", { title: `Edit ${store.name}`, store: store });
};

exports.updateStore = async (req, res) => {
  // set the location point to be a point
  req.body.location.type = "Point";
  const store = await Store.findOneAndUpdate(
    {
      _id: req.params.id,
    },
    req.body,
    {
      new: true, // return the new store instead of the old one
      runValidators: true,
    }
  ).exec();
  req.flash(
    "success",
    `Successfully updated <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View store -> </a>`
  );
  res.redirect(`/stores/${store._id}/edit`);
};

exports.getStoresByTag = async (req, res) => {
  const tag = req.params.tag;
  const tagQuery = tag || { $exists: true };

  const tagsPromise = Store.getTagsList();
  // Store.find checks automatically if tags[] includes tag
  const storesPromise = Store.find({ tags: tagQuery });

  const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);

  res.render("tag", { tags, stores, title: "Tags", tag });
};

exports.searchStores = async (req, res) => {
  const stores = await Store
    // Find results
    .find(
      { $text: { $search: req.query.q } },
      { score: { $meta: "textScore" } }
    )
    // Sort results
    .sort({
      score: { $meta: "textScore" },
    })
    // Limit to 5
    .limit(5);

  res.json(stores);
};

exports.mapStores = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat]
    .filter(isFinite)
    .map(parseFloat);

  const q = {
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates,
        },
        $maxDistance: 10000,
      },
    },
  };

  const stores = await Store.find(q)
    .select("slug name description location photo")
    .limit(10);

  res.json(stores);
};

exports.mapPage = (req, res) => {
  res.render("map", { title: "Map" });
};

exports.heartStore = async (req, res) => {
  // req.user.hearts returns [] of objects, not ids.
  const hearts = req.user.hearts.map((obj) => obj.toString());
  // If store has been already liked, remove it. Otherwise set it (only once)
  const operator = hearts.includes(req.params.id) ? "$pull" : "$addToSet";
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { [operator]: { hearts: req.params.id } },
    { new: true }
  );

  res.json(user);
};

exports.getHearts = async (req, res) => {
  // Find all stores where id of the store is in the array (of user.hearts)
  const stores = await Store.find({
    _id: { $in: req.user.hearts },
  });

  res.render("stores", { title: "Hearted stores", stores });
};

exports.getTopStores = async (req, res) => {
  // If you have a complex query, it's better to put it on the model itself
  const stores = await Store.getTopStores();

  res.render("topStores", { stores, title: "Top Stores!" });
};
