### AUTHENTICATE USER
Use Auth0, which returns -> email, name, sub
    ~ How exactly to get detection-method, isPlanetRo, avatar??
Create a new user in the BACKEND, and add in the DATABASE

    - user/addUser
    (Do I even need this route?)

    - user/:userId/edit 
    (--> is this the settings page?)

Can edit the user preferences if they want to add or delete - sites, alert-methods, projects (FRONTEND)
FRONTEND needs to fetch from the database, and display accordingly

    - user/:userId/delete

### MAINPAGE WITH MAP

    - user/:userId
FRONTEND should first fetch all the sites for the user, then fetch all alerts for those sites from the database


### SITE FUNCTIONALITY

    - user/:userId/addSite

    - user/:userId/site/:siteId
Does the backend even need this page?

    - user/:userId/site/:siteId/edit
    - user/:userId/site/:siteId/delete

### Alert Method

    -user/:userId/alertMethod/add
    -user/:userId/alertMethod/:alertMethodId/edit
    -user/:userId/alertMethod/:alertMethodId/delete

### ASYNCRONOUSLY CALLING NASAAPI TO UPDATE FIRE ALERT

As soon as the user logs in or adds sites, or adds alert method, check to see if all three are there for that said user,
- if true:
    check to see if there are any fire alerts for that site,
    - if fire:
        put it in the alert database, and refresh to the fire alert main page for the user, hence showing the fire, and send notifications

Asynchronously:
In every {X time}, for each user, repeat the above process, and send notifications, if true.


