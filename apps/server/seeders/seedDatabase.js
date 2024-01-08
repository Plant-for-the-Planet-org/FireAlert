// To run this file, navigate to the directory of this FireAlert app
// and, run this in the terminal:
// node apps/server/seeders/seedDatabase.mjs

import { prisma } from '../src/server/db';
import { seedGeoEvents } from './seedGeoEvents'
import { seedSites } from './seedSites'
import { seedUsers } from './seedUsers'
import { seedAlertMethods } from './seedAlertMethods'
import { seedSiteAlertsAndNotifications } from './seedSiteAlertsAndNotifications'

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
    } finally {
        await prisma.$disconnect();
    }
}

seedDatabase(2000, 1500000)
    .then(() => {
        console.log('Database seeded successfully.');
        process.exit(0);
    })
    .catch(error => {
        console.error('Error seeding database', error);
        process.exit(1);
    });

