const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

function createToken(userId) {
  return jwt.sign(
    {
      userId
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );
}

// Create a new account
router.post("/register", async function (request, response) {
  try {
    const { name, email, password } = request.body;

    if (!name || !email || !password) {
      return response.status(400).json({
        message: "Name, email, and password are required."
      });
    }

    if (password.length < 8) {
      return response.status(400).json({
        message: "Password must be at least 8 characters."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return response.status(409).json({
        message: "An account with that email already exists."
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password
    });

    const token = createToken(user._id.toString());

    return response.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error(error);

    if (error.code === 11000) {
      return response.status(409).json({
        message: "An account with that email already exists."
      });
    }

    return response.status(500).json({
      message: "Unable to create the account."
    });
  }
});

// Log into an existing account
router.post("/login", async function (request, response) {
  try {
    const { email, password } = request.body;

    if (!email || !password) {
      return response.status(400).json({
        message: "Email and password are required."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail
    }).select("+password");

    if (!user) {
      return response.status(401).json({
        message: "Incorrect email or password."
      });
    }

    const passwordMatches =
      await user.comparePassword(password);

    if (!passwordMatches) {
      return response.status(401).json({
        message: "Incorrect email or password."
      });
    }

    const token = createToken(user._id.toString());

    return response.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error(error);

    return response.status(500).json({
      message: "Unable to log in."
    });
  }
});
// Update the logged-in user's name
router.patch("/profile", protect, async function (request, response) {
  try {
    const name = request.body.name?.trim();

    if (!name) {
      return response.status(400).json({
        message: "Name is required."
      });
    }

    const user = await User.findByIdAndUpdate(
      request.userId,
      {
        name: name
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!user) {
      return response.status(404).json({
        message: "User was not found."
      });
    }

    response.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error(error);

    response.status(500).json({
      message: "Unable to update the name."
    });
  }
});

module.exports = router;