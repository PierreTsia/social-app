const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const myPassportService = require("../../passport")(passport);
const router = express.Router();
const cookieparser = require("cookieparser");

// Load Profile Model
const Tag = require("../../models/Tag");

//!* Validation
const ValidateProfileInput = require("../../validation/profile");
const profilesEqualityCheck = require("../../helpers/profileEquality");

//**ROUTES

// ? @route GET to api/tags/test
// ? @description Test profiles route
// ! @ access Public

router.get("/test", (req, res) =>
  res.json({ message: "api/tags route works fine 🖖" })
);

// ? @route GET to api/profiles/all
// ? @description Test profiles route
// ! @ access Public
router.get("/all", (req, res) => {
  const errors = {}
  Tag.find()
    .then(tags => {
      if (!tags) {
        errors.notags = "There are no profiles";
        return res.status(404).json(errors);
      }

      res.json(tags);
    })
    .catch(err => res.status(404).json({ tags: "There are no tags" }));
})

module.exports = router;
