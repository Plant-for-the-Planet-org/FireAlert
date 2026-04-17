## Single Alert Incident

I want you to create a Notification Eligibility check for each of the Site Incident.
For now this will be used in Incident Notification Creation Flow.
But later I will reuse this for Alert Notification Creation Flow.

There are Incident which has only 1 Alert. I do not want to Send End Notification for them - so do not create End Notification for them.
Make the Eligibility check & utilize here with SOLID principle.

## Incident Merge & Notification.

I want to Update Site Incident Notification Content.

Essentially there are Start & End of t Incident & that allows for notificaitons.

There is New Scenario where we are planning to Multiple Incietn Merge into one Incident.
I might need suitable message for Merging Incidentns.
Where under the hood Site Incident Merging is just creating new Incident & Linking with older Incident.

So at the Time of Notificaiton Creation we need to check if the Any Newly created Incident is Merged from any other Incidents.
two ways to check - chose whichever is robust.

1. current incidentId to any active Site Incident's relatedIncidentId.
2. check for parentIncidents contain any Ids if so then this itself is Child.

& For this type of Incident  
we need to create suitable Notification Status to track them.
we need to create new notificaiton content suitable for defining Incident Merger content.

At the end - when to incident is resolved - if Child Incident then We do not separately notify for the Parent as they are also resolved at the same time. So we combine all notifications into one. Since they are all saying same thing.

I think You can make use of the New Notification Eligibility system utilize in this case.
Create this as a service & During the Implementation follow Proper SOLID Principles.

You also need to change Schema - I want you to make those changes but I'll handle the migration process.
