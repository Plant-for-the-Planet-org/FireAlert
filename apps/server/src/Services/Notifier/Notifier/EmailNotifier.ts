import {type NotificationParameters} from '../../../Interfaces/NotificationParameters';
import type Notifier from '../Notifier';
import {NOTIFICATION_METHOD} from '../methodConstants';
import nodemailer from 'nodemailer';
import {emailTemplateString} from '../../../utils/notification/emailTemplateString';
import {env} from '../../../env.mjs';
import {logger} from '../../../../src/server/logger';

// Define Email Template
interface TemplateData {
  content: string;
  subject: string;
}

export function getEmailTemplate(data: TemplateData): string {
  let template = emailTemplateString;

  // Replace placeholders with actual data
  template = template.replace('{{email_content}}', data.content);
  template = template.replace('{{email_subject}}', data.subject);

  return template;
}

// Email Notifier
class EmailNotifier implements Notifier {
  getSupportedMethods(): Array<string> {
    return [NOTIFICATION_METHOD.EMAIL];
  }

  notify(
    destination: string,
    parameters: NotificationParameters,
  ): Promise<boolean> {
    const {message, subject} = parameters;

    // Check if SMTP is configured
    if (!env.SMTP_URL) {
      logger(`Email notifications are disabled: SMTP_URL is not configured`, 'warn');
      return Promise.resolve(false);
    }

    // Establish a transporter using SMTP settings
    // Be aware that AWS SES may assign passwords that include special characters such as "+", "/", "=", etc., which are not in line with URL standards
    // To accommodate these characters for env.SMTP_URL, encode them using encodeURIComponent() and then decode them prior to supplying to nodemailer
    // To employ secure SMTP, the AWS SES URL needs to start with smtps://

    const SMTP_URL = new URL(env.SMTP_URL);
    const transporter = nodemailer.createTransport({
      host: SMTP_URL.hostname,
      port: SMTP_URL.port,
      //secure = true if smtp_url  begins with smtps://
      secure: SMTP_URL.protocol === 'smtps:',
      auth: {
        user: SMTP_URL.username,
        pass: decodeURIComponent(SMTP_URL.password),
      },
    });

    const mailBody = `${message}`;
    // Define email options
    const mailOptions = {
      from: env.EMAIL_FROM,
      to: destination,
      subject: subject,
      html: getEmailTemplate({content: mailBody, subject: subject}),
    };

    // Send the email
    return new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (err) => {
        if (err) {
          logger(`Error sending email: ${err}`, 'error');
          reject(false);
        } else {
          // logger(`Message sent: ${info.response}`, "info");
          resolve(true);
        }
      });
    });
  }
}

export default EmailNotifier;
