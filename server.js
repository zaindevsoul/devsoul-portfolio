require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");
const Joi = require("joi");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "*",
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Content-Type,Authorization",
  })
);
app.options("*", cors());
app.use(bodyParser.json());

const contactSchema = Joi.object({
  firstname: Joi.string().min(1).max(50).required(),
  lastname: Joi.string().min(1).max(50).required(),
  subject: Joi.string().min(1).max(100).required(),
  message: Joi.string().min(1).max(10000).required(),
  recaptchaToken: Joi.string().required(),
});

app.use("/contactUs", express.static("index.html"));

app.post("/api/contact", async (req, res) => {
  console.log("Request body:", req.body);
  const { error } = contactSchema.validate(req.body);
  if (error) {
    return res
      .status(422)
      .json({ status: 422, message: error.details[0].message });
  }

  const { firstname, lastname, subject, message, recaptchaToken } = req.body;

  try {
    // ✅ Step 1: Verify reCAPTCHA Token with Google
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: recaptchaToken,
          remoteip:
            req.headers["x-forwarded-for"]?.split(",")[0] ||
            req.socket.remoteAddress ||
            req.ip,
        },
      }
    );

    if (!response.data.success) {
      return res.status(400).json({
        status: 400,
        message: "reCAPTCHA verification failed",
        error: response.data["error-codes"][0],
      });
    }

    // ✅ Step 2: Setup Nodemailer Transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: process.env.RECEIVER_EMAIL,
      subject: `Contact Us: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px; background-color: #f9f9f9;">
          <h2 style="text-align: center; color: #333;">New Contact Request</h2>
          <hr style="border: 0; height: 1px; background: #ddd;">
          <p><strong>Name:</strong> ${firstname} ${lastname}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <div style="background: #fff; padding: 15px; border-radius: 5px; border: 1px solid #ddd;">
            <p style="color: #555;">${message}</p>
          </div>
          <br>
          <p style="text-align: center; color: #777; font-size: 14px;">This message was sent via your contact form.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ status: 200, message: "Email sent successfully" });
  } catch (error) {
    console.log("Email error:", error);
    res.status(500).json({ status: 500, message: "Failed to send email" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
