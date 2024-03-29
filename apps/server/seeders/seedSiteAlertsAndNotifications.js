const db = require('./db');

function getRandomDate(startDate, endDate) {
    return new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
}

async function seedSiteAlertsAndNotifications(totalUsers, siteAlertBatchSize=10000) {
    const prisma = await db.prisma; // Await the prisma instance
    const totalSites = totalUsers*5
    let siteAlertBatch = [];
    let notificationBatch = [];

    const processBatch = async () => {
        if (siteAlertBatch.length > 0) {
            await prisma.siteAlert.createMany({ data: siteAlertBatch });
            await prisma.notification.createMany({ data: notificationBatch });
            siteAlertBatch = []; // Reset the siteAlert batch
            notificationBatch = []; // Reset the notificatons batch
        }
    };
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    for (let siteId = 1; siteId <= totalSites; siteId++) {
        for (let i = 0; i < 300; i++) {
            siteAlertBatch.push({
                id: `${siteId}siteAlert${i}`,
                confidence: 'high',
                detectedBy: 'SEEDER',
                distance: 0,
                eventDate: getRandomDate(twoMonthsAgo, new Date()),
                latitude: 10,
                longitude: 15,
                type: 'fire',
                siteId: siteId.toString(),
            })
            if (i < 100) {
                notificationBatch.push({
                    id: `${siteId}notification${i}`,
                    alertMethod: "email",
                    destination: `siteId${siteId}${i}@plant-for-the-planet.org`,
                    siteAlertId: `${siteId}siteAlert${i}`
                })
            }
            if(siteAlertBatch.length >= siteAlertBatchSize){
                await processBatch()
            }
        }
    }
    await processBatch()
    console.log(`Successfully Seeded SiteAlerts and Notifications`);
}
module.exports.seedSiteAlertsAndNotifications = seedSiteAlertsAndNotifications;

// seedSiteAlertsAndNotifications(2000)
//     .then(() => {
//         console.log('SiteAlerts and Notifications seeded successfully.');
//         process.exit(0);
//     })
//     .catch(error => {
//         console.error('Error seeding siteAlerts and notifications', error);
//         process.exit(1);
//     });