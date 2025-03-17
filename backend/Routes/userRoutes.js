const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const User = require("../Models/userModel");

// Register Route
router.post("/register", async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Check if the email ends with '@crud-operations.com'
        if (!email.endsWith("@crud-operations.com")) {
            return res.status(400).json({ message: "Email must end with @crud-operations.com" });
        }

        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "Email already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword });

        await newUser.save();
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// Login Route
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if the email ends with '@crud-operations.com'
        if (!email.endsWith("@crud-operations.com")) {
            return res.status(400).json({ message: "Email must end with @crud-operations.com" });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        res.json({ 
            message: "Login successful", 
            user: { username: user.username, email: user.email }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
