import { type NotificationParameters } from "../../Interfaces/NotificationParameters";
import NotifierRegistry from "../../Services/Notifier/NotifierRegistry";
import type { User } from "@prisma/client";


const sendEmail = async (destination: string, params: NotificationParameters) => {
  const notifier = NotifierRegistry.get('email');
  await notifier.notify(destination, params);
  return true;
};

const getName = (user: User): string => {
  return user.name || 'User';
};

// Send email to user when they sign up
const sendWelcomeEmail = async (user: User): Promise<boolean> => {
  const params: NotificationParameters = {
    message: `<p>Dear ${getName(user)},</p>

      <p>Congratulations and welcome to FireAlert, an innovative, open-source application designed to make fire monitoring a seamless experience!</p>
      
      <p>As a FireAlert user, you have the capability to create new sites and closely monitor them for any fire incidents. 
      For those who have utilized the Plant-for-the-Planet platform previously, we have already imported your sites into FireAlert for your convenience. 
      Feel free to choose which sites you wish to monitor from the Settings page of our application.</p>
      
      <p>To keep you updated on possible fire incidents, FireAlert offers you the flexibility to receive alerts in multiple ways. 
      Choose between our in-app notifications, SMS alerts, or opt for alerts sent directly to a specified webhook address.</p>
      
      <p>We greatly value your feedback and encourage you to share any questions or suggestions with us.
      Please reach out to us at <a href="mailto:firealert@plant-for-the-planet.org">firealert@plant-for-the-planet.org</a>.</p>
      
      <p>We're excited to have you on board, and thank you for choosing FireAlert!</p>
      
      <p>Best,<br>The FireAlert Team</p>`,
    subject: 'Welcome to FireAlert'
  };
  return await sendEmail(user.email, params);
};


// Send email to user when they request to delete Account
const sendSoftDeletionEmail = async (user: User): Promise<boolean> => {
  const params: NotificationParameters = {
    message: `<p>Dear ${getName(user)},</p>
  
      <p>We have received a request to delete your FireAlert account. As part of our commitment to your data privacy, we will initiate the deletion process for your account, marking it for permanent deletion in 7 days.</p>
  
      <p>However, if you've changed your mind or if this action was not initiated by you, you can restore your account simply by logging in within these 7 days. Upon successful login, your account will be automatically recovered.</p>
  
      <p>If you have any issues logging in or if you need any help, please do not hesitate to contact us at <a href="mailto:firealert@plant-for-the-planet.org">firealert@plant-for-the-planet.org</a>.</p>
  
      <p>Best,<br>The FireAlert Team</p>`,
    subject: 'FireAlert Account Marked for Deletion'
  };
  return await sendEmail(user.email, params);
};

// Send email to user when user's account is deleted
const sendAccountDeletionConfirmationEmail = async (user: User): Promise<boolean> => {
  const params: NotificationParameters = {
    message: `<p>Dear ${getName(user)},</p>
  
      <p>We're writing to confirm that your FireAlert account has been successfully deleted. We're sad to see you go.</p>
      
      <p>Remember, you're always welcome back at FireAlert. If you ever decide to return, we'd be more than happy to serve you again.</p>
      
      <p>If you have any feedback or suggestions for us, or if there was anything you were unsatisfied with, we'd love to hear from you. We are constantly working to improve our services, and your input is greatly valued.</p>
  
      <p>You can reach us anytime at <a href="mailto:firealert@plant-for-the-planet.org">firealert@plant-for-the-planet.org</a>.</p>
  
      <p>Thank you for having been a part of FireAlert. We wish you all the best.</p>
  
      <p>Best,<br>The FireAlert Team</p>`,
    subject: 'FireAlert Account Deletion Confirmation'
  };
  return await sendEmail(user.email, params);
};

// Send email to user when user cancels account deletion because of Login
const sendAccountDeletionCancellationEmail = async (user: User): Promise<boolean> => {
  const params: NotificationParameters = {
    message: `<p>Dear ${getName(user)},</p>
  
      <p>We're pleased to inform you that the deletion process for your FireAlert account has been successfully cancelled. Your account is still active, and all your settings remain as you left them.</p>
      
      <p>If this cancellation was made in error, or if you wish to continue with the deletion, please log in and navigate to the account settings page to initiate the deletion process again.</p>
      
      <p>If you have any questions, concerns, or if you need any assistance, please do not hesitate to reach out to us at <a href="mailto:firealert@plant-for-the-planet.org">firealert@plant-for-the-planet.org</a>.</p>
      
      <p>We're glad to have you with us, and thank you for using FireAlert!</p>
      
      <p>Best,<br>The FireAlert Team</p>`,
    subject: 'FireAlert Account Deletion Cancelled'
  };
  return await sendEmail(user.email, params);
};


const sendEmailVerificationCode = async (user: User, verificationEmail: string, verificationCode: string): Promise<boolean> => {
  const params: NotificationParameters = {
    message: `<p>Dear ${getName(user)},</p>
      
      <p>Your FireAlert verification code for ${verificationEmail} is <b>${verificationCode}</b>.This code will expire in 30 minutes.</p>
  
      <p>This verification was initiated by ${user.email}.</p>
  
      <p>If you have any issues or need any help, please don't hesitate to contact us at <a href="mailto:firealert@plant-for-the-planet.org">firealert@plant-for-the-planet.org</a>.</p>

      <p>Best,<br>The FireAlert Team</p>`,
    subject: 'FireAlert Email Verification Code'
  };
  return await sendEmail(verificationEmail, params);
};


export { sendWelcomeEmail, sendSoftDeletionEmail, sendAccountDeletionConfirmationEmail, sendEmailVerificationCode, sendAccountDeletionCancellationEmail };
