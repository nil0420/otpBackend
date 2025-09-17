// server.js
const express = require('express');
const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to parse JSON bodies
app.use(express.json());

// Temporary in-memory storage (use DB in production)
const otpStore = {};

// Create a Nodemailer transporter using Gmail + App Password
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ✅ Send OTP
app.post('/api/send-otp', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    // 1. Generate a 6-digit OTP
    const otp = otpGenerator.generate(6, {
        digits: true,
        alphabets: false,
        upperCase: false,
        specialChars: false,
    });

    // 2. Store OTP with 5-min expiry
    const expiryTime = Date.now() + 5 * 60 * 1000;
    otpStore[email] = { otp, expiryTime };

    // 3. Email content
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your Talrn Registration OTP',
        html: `
            <h3>Your OTP Code</h3>
            <p><b>${otp}</b></p>
            <p>This OTP is valid for <b>5 minutes</b>. Do not share it with anyone.</p>
        `,
    };

    // 4. Send email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('❌ Error sending email:', error);
            return res.status(500).json({ success: false, message: 'Failed to send OTP.' });
        }
        console.log('✅ OTP sent:', info.response);
        res.status(200).json({ success: true, message: 'OTP sent to your email.' });
    });
});

// ✅ Verify OTP
app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const storedData = otpStore[email];

    if (!storedData) {
        return res.status(400).json({ success: false, message: 'OTP not found. Please resend.' });
    }

    if (Date.now() > storedData.expiryTime) {
        delete otpStore[email];
        return res.status(400).json({ success: false, message: 'OTP has expired. Please resend.' });
    }

    if (otp === storedData.otp) {
        delete otpStore[email];
        return res.status(200).json({ success: true, message: 'Registration successful!' });
    } else {
        return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
