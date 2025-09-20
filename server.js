const express = require('express');

const nodemailer = require('nodemailer');

const otpGenerator = require('otp-generator');

const cors = require('cors');

require('dotenv').config();



const app = express();

const PORT = process.env.PORT || 5000;



app.use(express.json());

app.use(cors()); //

const otpStore = {};



const transporter = nodemailer.createTransport({

    service: 'gmail',

    auth: {

        user: process.env.EMAIL_USER,

        pass: process.env.EMAIL_PASS,

    },

});



app.post('/api/send-otp', (req, res) => {

    const { email } = req.body;



    if (!email) {

        return res.status(400).json({ success: false, message: 'Email is required.' });

    }



    const otp = otpGenerator.generate(6, {

        digits: true,

        alphabets: false,

        upperCase: false,

        specialChars: false,

    });

    console.log("this is my OTP", otp)

    const expiryTime = Date.now() + 5 * 60 * 1000;

    otpStore[email] = { otp, expiryTime };



   

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

   console.log(mailOptions, "mailoptions")

   

    transporter.sendMail(mailOptions, (error, info) => {

        if (error) {

            console.error(' Error sending email:', error.stack);

            return res.status(500).json({ success: false, message: 'Failed to send OTP.' });

        }

        console.log('✅ OTP sent:', info.response);

        res.status(200).json({ success: true, message: 'OTP sent to your email.' });

    });

});



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



app.listen(PORT, () => {

    console.log(`🚀 Server running on http://localhost:${PORT}`);

});







