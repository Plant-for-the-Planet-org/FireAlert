const db = require('./db');

async function seedAlertMethods(totalUsers, batchSize=500) {
    const prisma = await db.prisma; // Await the prisma instance
    let batch = [];

    const processBatch = async () => {
        if (batch.length > 0) {
            await prisma.alertMethod.createMany({data: batch});
            batch = []; // Reset the batch
        }
    };
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    for (let userId = 1; userId <= totalUsers; userId++) {
        const shouldDelete = Math.random() < 0.05; // 25% chance of being marked for deletion
        batch.push({
            id:`${userId}alertMethodEmail0`,
            destination: `user${userId}email0@plant-for-the-planet.org`,
            method: "email",
            isEnabled: true,
            isVerified: true,
            userId: userId.toString(),
            deletedAt: shouldDelete ? twoMonthsAgo : null,
        })
        batch.push({
            id:`${userId}alertMethodSMS`,
            destination: `+977${userId}`,
            method: "sms",
            isEnabled: true,
            isVerified: true,
            userId: userId.toString(),
            deletedAt: shouldDelete ? twoMonthsAgo : null,
        })
        batch.push({
            id:`${userId}alertMethodEmail1`,
            destination: `user${userId}email1@plant-for-the-planet.org`,
            method: "email",
            isEnabled: true,
            isVerified: true,
            userId: userId.toString(),
            deletedAt: shouldDelete ? twoMonthsAgo : null,
        })
        if(batch.length >= batchSize){
            await processBatch()
        }
    }
    await processBatch()
    console.log(`Successfully Seeded AlertMethods`);
}
module.exports.seedAlertMethods = seedAlertMethods;

// seedAlertMethods(2000)
//     .then(() => {
//         console.log('AlertMethods seeded successfully.');
//         process.exit(0);
//     })
//     .catch(error => {
//         console.error('Error seeding alertMethods', error);
//         process.exit(1);
//     });