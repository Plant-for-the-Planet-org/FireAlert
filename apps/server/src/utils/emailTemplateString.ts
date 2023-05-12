export const emailTemplateString = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://fonts.googleapis.com/css?family=Open+Sans&display=swap" rel="stylesheet" />
  <title>{{email_subject}}</title>
  <style>
    body {
      font-family: 'Roboto', sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f6f6f6;
    }
    .email-container {
      max-width: 600px;
      margin: auto;
      padding: 20px;
      background-color: #ffffff;
    }
    .email-content {
      font-family: 'Open Sans', sans-serif;
    }
    a {
      color: #E86F56;
      text-decoration: none;
    }
    .button {
      display: inline-block;
      margin: 10px 0;
      padding: 10px 20px;
      background-color: #ffffff;
      border: 2px solid #E86F56;
      border-radius: 14px;
      color: #E86F56;
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        padding: 10px;
      }
    }
  </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
    <svg width="600" height="40" viewBox="0 0 600 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="600" height="40" fill="url(#paint0_linear_544_8273)"/>
      <defs>
        <linearGradient id="paint0_linear_544_8273" x1="120" y1="20" x2="600" y2="20" gradientUnits="userSpaceOnUse">
          <stop stop-color="#E86F56"/>
          <stop offset="1" stop-color="#FA7902"/>
        </linearGradient>
      </defs>
    </svg>
    </div>
    <div class="email-content">
        {{email_content}}
    </div>
  
  </div>
</body>
</html>
`;