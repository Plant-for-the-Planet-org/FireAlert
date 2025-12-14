import {type NotificationParameters} from '../../../Interfaces/NotificationParameters';
import type Notifier from '../Notifier';
import {NOTIFICATION_METHOD} from '../methodConstants';
import nodemailer from 'nodemailer';
import {emailTemplateString} from '../../../utils/notification/emailTemplateString';
import {env} from '../../../env.mjs';
import {logger} from '../../../../src/server/logger';
import {handleFailedNotification as genericFailedNotificationHandler} from '../handleFailedNotification';

// Define Email Template
interface TemplateData {
  content: string;
  subject: string;
  unsubscribeUrl?: string;
}

export function getEmailTemplate(data: TemplateData): string {
  let template = emailTemplateString;

  // Replace placeholders with actual data
  template = template.replace('{{email_content}}', data.content);
  template = template.replace('{{email_subject}}', data.subject);

  // Add unsubscribe link if provided
  const unsubscribeLink = data.unsubscribeUrl
    ? `<br /><a href="${data.unsubscribeUrl}" style="color: #aaa; text-decoration: underline;">Unsubscribe from email alerts.</a>`
    : '';
  template = template.replace('{{unsubscribe_url}}', unsubscribeLink);

  return template;
}

// Email Notifier
class EmailNotifier implements Notifier {
  getSupportedMethods(): Array<string> {
    return [NOTIFICATION_METHOD.EMAIL];
  }

  async notify(
    destination: string,
    parameters: NotificationParameters,
  ): Promise<boolean> {
    const {message, subject, unsubscribeToken} = parameters;

    // Ensure required parameters are strings
    if (!message || !subject) {
      logger('Email notification missing required parameters', 'error');
      return false;
    }

    // Check if SMTP is configured
    if (!env.SMTP_URL) {
      logger(
        `Email notifications are disabled: SMTP_URL is not configured`,
        'warn',
      );
      return Promise.resolve(false);
    }

    // Establish a transporter using SMTP settings
    // Be aware that AWS SES may assign passwords that include special characters such as "+", "/", "=", etc., which are not in line with URL standards
    // To accommodate these characters for env.SMTP_URL, encode them using encodeURIComponent() and then decode them prior to supplying to nodemailer
    // To employ secure SMTP, the AWS SES URL needs to start with smtps://

    const SMTP_URL = new URL(env.SMTP_URL);
    const transporter = nodemailer.createTransport({
      host: SMTP_URL.hostname,
      port: parseInt(SMTP_URL.port, 10),
      // secure = true if smtp_url  begins with smtps://
      secure: SMTP_URL.protocol === 'smtps:',
      auth: {
        user: SMTP_URL.username,
        pass: decodeURIComponent(SMTP_URL.password),
      },
    });

    const mailBody = message;

    // Generate unsubscribe URL if token is provided
    const unsubscribeUrl = unsubscribeToken
      ? `${String(env.NEXT_PUBLIC_HOST)}/unsubscribe/${String(
          unsubscribeToken,
        )}`
      : undefined;

    // Define email options
    const mailOptions = {
      from: env.EMAIL_FROM,
      to: destination,
      subject: subject,
      html: getEmailTemplate({
        content: mailBody,
        subject: subject,
        unsubscribeUrl: unsubscribeUrl,
      }),
    };
    console.log(mailOptions.html);

    // Send the email
    try {
      await transporter.sendMail(mailOptions);
      // logger(`Message sent: ${info.response}`, "info");
      return true;
    } catch (err) {
      logger(`Error sending email: ${String(err)}`, 'error');

      await this.handleFailedNotification({
        destination: destination,
        method: NOTIFICATION_METHOD.EMAIL,
      });

      return false;
    }
  }

  handleFailedNotification = genericFailedNotificationHandler;
}

export default EmailNotifier;
