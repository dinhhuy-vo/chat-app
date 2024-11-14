import nodemailer from "nodemailer";
import crypto from "crypto";

export const sendMail = async (email, subject, code) => {
  try {
    const transporter = nodemailer.createTransport({
      service: process.env.SERVICE,
      auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.AUTH_EMAIL,
      to: email,
      subject: subject,
      html: `<p>Your code is ${code}</p>`,
    });
    console.log("Email sent successfully");
  } catch (error) {
    console.log("Email not sent");
    console.log(error);
  }
};

export const generateVerificationCode = () => {
  return crypto.randomBytes(3).toString("hex");
};
