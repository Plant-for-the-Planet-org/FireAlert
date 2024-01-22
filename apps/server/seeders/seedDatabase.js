// To run this file, navigate to the directory of this FireAlert app
// first set node environment as development by typing this in the terminal: $env:NODE_ENV="development" 
// and, run this in the terminal: node apps/server/seeders/seedDatabase.js
// If Error -> Reached heap limit Allocation failed - Javascript heap out of memory
// Use this command instead: node --max-old-space-size=4096 apps/server/seeders/seedDatabase.js

// With about million geoEvents and 2000 users, it may take upto 1 hour to seed the entire database

const { seedGeoEvents } = require('./seedGeoEvents');
const { seedSites } = require('./seedSites');
const { seedUsers } = require('./seedUsers');
const { seedAlertMethods } = require('./seedAlertMethods');
const { seedSiteAlertsAndNotifications } = require('./seedSiteAlertsAndNotifications');

// The total number of sites created will be 5 times the number of users, with each user having 5 sites
// Each site has 1000 siteAlerts from dates ranging from now to 2 months ago
// Each site has about 300 notifications
// Each user has about 3 alertMethods
// The deletedAt for sites, alertMethods, and users will be set in random, for 5% rows to have a deletedAt of 1 month ago in every table

async function seedDatabase(numberOfUsers, numberOfGeoEvents) {
    try {
        await seedGeoEvents(numberOfGeoEvents);
        await seedUsers(numberOfUsers);
        await seedSites(numberOfUsers);
        await seedAlertMethods(numberOfUsers);
        await seedSiteAlertsAndNotifications(numberOfUsers);
        console.log('Database seeded successfully.');
    } catch (error) {
        console.error('Error seeding database:', error);
    }
}

seedDatabase(500, 150000)
    .then(() => {
        console.log('Database seeded successfully.');
        process.exit(0);
    })
    .catch(error => {
        console.error('Error seeding database', error);
        process.exit(1);
    });

