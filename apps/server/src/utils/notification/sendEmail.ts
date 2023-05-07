import nodemailer from "nodemailer";

// Function to send an email using SMTP
export const sendEmail = async (to: string, subject: string, body: string) => {
  try {
    // Create a transporter with SMTP configuration for Gmail
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "your_email@gmail.com",
        pass: "your_password",
      },
    });

    // Define email options
    const mailOptions = {
      from: "your_email@gmail.com",
      to: to,
      subject: subject,
      text: body,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    return true; // Email sent successfully
  } catch (error) {
    console.error("Error sending email:", error);
    return false; // Failed to send email
  }
};
