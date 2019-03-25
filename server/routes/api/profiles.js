const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const myPassportService = require("../../passport")(passport);
const router = express.Router();
const cookieparser = require("cookieparser");
const _ = require("lodash");
/*
//!* config
const keys = require("./../../../config/keys");*/

// Load Profile Model
const User = require("../../models/User");
const Profile = require("../../models/Profile");
const Tag = require("../../models/Tag");

//!* Validation
const ValidateProfileInput = require("../../validation/profile");
const profilesEqualityCheck = require("../../helpers/profileEquality");
const randomColor = require("../../helpers/randomColor");
const sanitizeTag = require("../../helpers/sanitizeTag");

const formidable = require("formidable");
const cloudinary = require("cloudinary").v2;
require('dotenv').config()


cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

//**ROUTES

// ? @route GET to api/profiles/test
// ? @description Test profiles route
// ! @ access Public

router.get("/test", (req, res) =>
  res.json({ message: "api/profiles route works fine 🖖" })
);

// ? @route GET to api/profiles/all
// ? @description all profiles route
// ! @ access Private

router.get("/all", (req, res, next) => {
  passport.authenticate("jwt", (err, user, info) => {
    if (err) {
      return next(err);
    }
    const errors = {};
    if (!user) {
      return res.json({ error: "Unauthorized" });
    } else {
      Profile.find({})
        .populate(["tags", "user"])
        .then(profiles => {
          if (!profiles) {
            errors.noprofile = "No Profiles found";
            return res.json({ errors });
          }
          res.json({ profiles });
        })
        .catch(e => res.status(404).json(e));
    }
  })(req, res, next);
});

// ? @route GET to api/profiles/current
// ? @description Test profiles route
// ! @ access Restricted
router.get("/current", (req, res, next) => {
  passport.authenticate("jwt", (err, user, info) => {
    if (err) {
      return next(err);
    }
    const errors = {};
    if (!user) {
      return res.json({ user: false });
    } else {
      const userId = user.id;

      console.log(cloudinary);

      cloudinary.uploader.upload(
        "/home/pierre_t/git/nuxt-express/static/v.png",
        function(error, result) {
          console.log(result, error);
        }
      );

      Profile.findOne({ user: userId })
        .populate("tags")
        .then(profile => {
          if (!profile) {
            errors.noprofile = "There is no profile for this user";
            return res.json({ errors });
          }
          res.json({ profile });
        })
        .catch(e => res.status(404).json(e));
    }
  })(req, res, next);
});

// @route   POST api/profile
// @desc    Create or edit user profile
// @access  Private
router.post("/", (req, res, next) => {
  passport.authenticate("jwt", async (err, user, info) => {
    if (err) {
      return next(err);
    }
    const errors = {};

    if (!user) {
      errors.user = "user not found";
      return res.status(400).json(errors);
    } else {
      const { errors, isValid } = ValidateProfileInput(req.body);
      // Check Validation
      if (!isValid) {
        // Return any errors with 400 status
        return res.status(400).json(errors);
      }

      // Get fields
      const profileFields = {};
      profileFields.user = req.body.user.id;
      if (req.body.handle) profileFields.handle = req.body.handle;
      if (req.body.website) profileFields.website = req.body.website;
      if (req.body.location) profileFields.location = req.body.location;
      if (req.body.bio) profileFields.bio = req.body.bio;
      if (req.body.status) profileFields.status = req.body.status;
      if (req.body.dob) profileFields.dob = req.body.dob;

      const userProfile = await Profile.findOne({ user: user.id });
      if (userProfile) {
        if (profileFields.handle) {
          const profileByHandle = await Profile.findOne({
            handle: profileFields.handle
          });
          if (profileByHandle) {
            if (!profilesEqualityCheck(profileByHandle, userProfile)) {
              errors.handle = "That handle already exists";
              return res.status(400).json(errors);
            }
          }
        }
        // Update
        Profile.findOneAndUpdate(
          { user: user.id },
          { $set: profileFields },
          { new: true }
        )
          .populate(["tags", "user"])
          .then(profile => {
            res.json({ success: true, profile });
          });
      } else {
        //Create new Profile
        Profile.findOne({ handle: profileFields.handle }).then(profile => {
          if (profile) {
            errors.handle = "That handle already exists";
            res.status(400).json({ errors });
          }

          // Save Profile
          new Profile(profileFields)
            .save()
            .then(profile => res.json({ profile }));
        });
      }
    }
  })(req, res, next);
});

// ? @route POST to api/profiles/avatar
// ? @description Update User Avatar
// ! @ access Restricted

router.post("/avatar", (req, res, next) => {
  console.log(req.headers);
  let avatarUrl;

  passport.authenticate("jwt", async (err, user, info) => {
    if (!user) {
      return res.json({ user: false });
      console.log("not found");
    } else {
      const userId = user.id;
      console.log(user);
      try {
        //res.json(userProfile)

        new formidable.IncomingForm().parse(req, (err, fields, files) => {
          if (err) {
            console.error("Error", err);
            throw err;
          }
          console.log("Fields", fields);
          console.log("Files", files.file);

          cloudinary.uploader.upload(files.file.path, async function(
            error,
            result
          ) {
            console.log(result, error);
            avatarUrl = result.secure_url;
            console.log("avatarUrl", avatarUrl);
            User.findOneAndUpdate({ _id: userId }, { avatar: avatarUrl }).then(
              user => res.json({ avatar: avatarUrl })
            );
          });
        });
      } catch (e) {
        console.log(e);
      }
    }
  })(req, res, next);

});

// ? @route POST to api/profiles/current
// ? @description Test profiles route
// ! @ access Restricted
router.post("/tags/upsert", (req, res, next) => {
  passport.authenticate("jwt", async (err, user, info) => {
    if (err) {
      return next(err);
    }
    const errors = {};
    if (!user) {
      return res.json({ user: false });
    } else {
      const userId = user.id;
      try {
        const userProfile = await Profile.findOne({ user: userId });

        if (!userProfile) {
          errors.noprofile = "There is no profile for this user";
          return res.status(404).json(errors);
        }

        const mergedTags = req.body;
        const newSavedTags = [];

        if (mergedTags.new.length) {
          for (let newTag of mergedTags.new) {
            const existingTag = await Tag.findOne({ label: newTag.label });
            if (!existingTag) {
              const createdTag = await new Tag({
                label: sanitizeTag(newTag.label),
                color: randomColor()
              }).save();
              newSavedTags.push(createdTag);
            }
          }

          //find
        }
        const newUsertags = mergedTags.existing.concat(newSavedTags);

        Profile.findOneAndUpdate(
          { user: userId },
          { tags: newUsertags },
          { new: true }
        ).then(profile => {
          res.json({ success: true, tags: newUsertags });
        });
      } catch (e) {
        res.status(404).json(e);
      }
    }
  })(req, res, next);
});

module.exports = router;
