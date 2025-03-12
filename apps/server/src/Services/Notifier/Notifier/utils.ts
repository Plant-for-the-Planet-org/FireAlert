const slackSiteNotifications = process.env.SLACK_KEY_SITE_NOTIFICATIONS!;
if(!slackSiteNotifications) {
  console.log("Slack site-notifications disabled."); 
}

export function sendToSlack(message: string) {
  const myHeaders = new Headers();
  myHeaders.append("Content-type", "application/json");

  const raw = JSON.stringify({
    text: message,
  });

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
    redirect: "follow",
  };

  fetch(
    slackSiteNotifications,
    requestOptions
  )
    .then((response) => response.text())
    .then((result) => console.log(result))
    .catch((error) => console.error(error));
}
