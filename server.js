require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

app.post("/api/contact", async (req, res) => {
  const { firstname, lastname, subject, message } = req.body;

  if (!firstname || !lastname || !subject || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
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
    res.status(200).json({ success: "Email sent successfully" });
  } catch (error) {
    console.error("Email error:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
