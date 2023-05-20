import { emailTemplateString } from './emailTemplateString';

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
