## Tasks

Task 1: (Priority: Low)

Add Unsubscription Link in the Incident Notification Emails in SenIncidentNotification.ts. This will be similar as.

```typescript
// in EmailNotifier.ts
const unsubscribeLink = data.unsubscribeUrl
  ? `<br /><a href="${data.unsubscribeUrl}" style="color: #aaa; text-decoration: underline;">Unsubscribe from email alerts.</a>`
  : '';
```

or

```typescript
// in EmailNotifier.ts
// Generate unsubscribe URL if token is provided
const unsubscribeUrl = unsubscribeToken
  ? `${String(env.NEXT_PUBLIC_HOST)}/unsubscribe/${String(unsubscribeToken)}`
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
```

Task 2: (Priority: High)

If SiteIncident.reviewStatus = SiteIncidentReviewStatus.STOP_ALERTS,
Then Stop Alerts related to that Incident.

Task 3: (Priority: High)

API to stop alerts for a specific incident.

Task 4: (Priority: CRITICAL)

I have updated the relation in the schema.prisma & generated the client types. all prisma site queries should use `siteIncidents` instead of `incidents`.

---

## Stop Alerts

1. Update `CreateIncidentNotifications.ts`.

(thought): If user is able to update the `reviewStatus`, that means we already have a `SiteIncident` & `Notificaiton` for `INCIDENT_START` which is linked to the incident via `SiteIncident.startNotificationId`.
After we call the API to stop the alerts, we should update the `reviewStatus` to `STOP_ALERTS`.
Base on this system will ignore Sending Notifications for `INCIDENT_END`.

2. Update `CreateNotificaitons.ts`.

(thought): CreateIncidentNotifications will take care of the Incident Notifications which we are sending via email, sms, whatsapp. But device, webhook notifications are handled by `CreateNotifications.ts`. If `SiteIncident.reviewStatus` is `STOP_ALERTS`, we should not send device, webhook notifications.
To Stop that we must check `SiteIncident.reviewStatus` in `CreateNotifications.ts` and if it is `STOP_ALERTS`, we should not send device, webhook notifications. we need to update the `const unprocessedAlerts = await prisma.siteAlert.findMany({` query. But SiteIncident is fairly new feature so we might not find siteIncidentId for all the alerts. But since this is a CRON & Incidents are already published feature so the Entries already will have the siteIncidentId with them. So we need to be careful to call the keys if exists. Instead of using relational query, use simpler query I don't have much confidence on the query, so update the query select the `siteIncident.reviewStatus` field & Check if the the value is `STOP_ALERTS` (Ofcourse check with enum type so we do not miss any type issue) then skip creating the notification. If there are no such field or not matching value or any other issue, we should continue creating the notification.

In both the files add a log (& only logs - do not update any response type - my automations are dependent on them) to indicate

1. in case of `CreateIncidentNotifications.ts`, how many notifications are skipped for the `STOP_ALERTS` status, & for which alertMethod.
2. in case of `CreateNotifications.ts`, how many notifications are skipped for the `STOP_ALERTS` status & for which alertMethod.

---

## Prisma Schema Update refactor

```
model Site {
  ...
    incidents      SiteIncident[]
  ...
}
```

to

```
model Site {
  ...
    siteIncidents      SiteIncident[]
  ...
}
```

Check all the queries involving site to figure out if there are anything to update or not.
