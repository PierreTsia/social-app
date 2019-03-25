const express = require("express");
const bcrypt = require("bcryptjs");
const gravatar = require("gravatar");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const myPassportService = require("../../passport")(passport);

const router = express.Router();

//* config
const keys = require("./../../config/keys");

//*models
const User = require("../../models/User");
const Profile = require("../../models/Profile");

//* Validation
const validateRegisterInput = require("../../validation/register");
const validateLoginInput = require("../../validation/login");

//**ROUTES

// ? @route GET to api/users/test
// ? @description Test users route
// ! @ access Public

router.get("/test", (req, res) =>
  res.json({ message: "api/users route works fine 🖖" })
);

// ? @route GET to api/users/register
// ? @description Register New User
//! @ access Public

router.post("/register", (req, res) => {
  const { errors, isValid } = validateRegisterInput(req.body);

  if (!isValid) {
    return res.status(400).json(errors);
  }

  User.findOne({ email: req.body.email }).then(user => {
    if (user) {
      errors.email = "Email already exists";
      return res.status(400).json(errors);
    } else {
      const avatar = gravatar.url(req.body.email, {
        s: "200", // Size
        r: "pg", // Rating
        d: "mm" // Default
      });

      const newUser = new User({
        name: req.body.name,
        email: req.body.email,
        avatar,
        password: req.body.password
      });

      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
          if (err) throw err;
          newUser.password = hash;
          newUser
            .save()
            .then(savedUser => {
              //Sign token
              const { id, name, email, avatar } = savedUser;
              const user = { id, name, email, avatar };

              jwt.sign(
                user,
                keys.secretOrKey,
                { expiresIn: 3600 },
                (err, token) => {
                  res.json({
                    success: true,
                    accessToken: token,
                    user
                  });
                }
              );
            })
            .catch(err => console.log(err));
        });
      });
    }
  });
});

//  @route POST to api/users/login
//  @description login user : returning JWT token
//  @ access Public

router.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  const { errors, isValid } = validateLoginInput(req.body);

  if (!isValid) {
    return res.status(400).json(errors);
  }

  User.findOne({ email }).then(user => {
    if (!user) {
      errors.email = "User not found";
      return res.status(404).json(errors);
    }
    bcrypt.compare(password, user.password).then(isMatch => {
      if (isMatch) {
        //User match
        const payload = {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          email: user.email
        };

        //Sign token
        jwt.sign(
          payload,
          keys.secretOrKey,
          { expiresIn: 3600 },
          async (err, token) => {
            const profile = await Profile.findOne({user: user.id})
            payload.profile = profile
            res.json({
              success: true,
              accessToken: token,
              user: payload
            });
          }
        );
      } else {
        errors.password = "Incorrect Password";
        return res.status(400).json(errors);
      }
    });
  });
});

router.post("/logout", (req, res) => {
  res.json({ success: true });
});

//  @route GET to api/users/current
//  @description Return Current User
//  @access      Private

router.get("/current", (req, res, next) => {
  passport.authenticate("jwt", async (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.json({user: false});
    }
    const profile = await Profile.findOne({user: user.id}).populate('tags')

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    };
    res.json({
        success: true,
        user: payload,
        profile,
    })


  })(req, res, next);
});

module.exports = router;
