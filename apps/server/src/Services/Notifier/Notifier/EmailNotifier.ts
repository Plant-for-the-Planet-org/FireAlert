import { type NotificationParameters } from "../../../Interfaces/NotificationParameters";
import type Notifier from "../Notifier";
import { NOTIFICATION_METHOD } from "../methodConstants";
import nodemailer from "nodemailer";
import { emailTemplateString } from '../../../utils/notification/emailTemplateString';
import { env } from '../../../env.mjs';

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

    notify(destination: string, parameters: NotificationParameters): Promise<boolean> {
        const { message, subject, url } = parameters;

        console.log(`Sending message ${message} to ${destination}`)

        // Create a transporter with SMTP configuration for Gmail
        const transporter = nodemailer.createTransport(env.SMTP_URL);
        const mailBody = `${subject} </br> ${message} </br>${url}`;
        // Define email options
        const mailOptions = {
            from: env.EMAIL_FROM,
            to: destination,
            subject: subject,
            html: getEmailTemplate({ content: mailBody, subject: subject })
        };

        // Send the email
        return new Promise((resolve, reject) => {
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.error(`Error sending email: ${err}`);
                    reject(false);
                } else {
                    console.log(`Message sent: ${info.response}`);
                    resolve(true);
                }
            });
        });
    }
}

export default EmailNotifier;
