const express = require("express");
const router = express.Router();
const storeController = require("../controllers/storeController");

router.get("/", storeController.homePage);

router.get("/reverse/:name", (req, res) => {
  // res.send("it works");
  const reversed = [...req.params.name].reverse().join("");
  res.send(reversed);
});

module.exports = router;
