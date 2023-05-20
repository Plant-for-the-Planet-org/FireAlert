import nodemailer from "nodemailer";
import { env } from '../../env.mjs';
import { getEmailTemplate } from './emailTemplate';
import { captureException, flush } from "@sentry/nextjs"

// Function to send an email using SMTP
export const sendEmail = async (to: string, subject: string, body: string) => {
  try {
    // Create a transporter with SMTP configuration for Gmail
    const transporter = nodemailer.createTransport(env.SMTP_URL);

    // Define email options
    const mailOptions = {
      from: env.EMAIL_FROM,
      to: to,
      subject: subject,
      html: getEmailTemplate({ content: body, subject: subject }),
      text: body,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    return true; // Email sent successfully
    //Todo: add delivery status to database
  } catch (error) {
    captureException(new Error(`Error sending email: ${error}`));
    await flush(2000);

    console.error("Error sending email:", error);
    return false; // Failed to send email
  }
};
