const db = require('./db');

async function seedUsers(totalUsers, batchSize=500) {
    const prisma = await db.prisma; // Await the prisma instance
    let batch = [];

    const processBatch = async () => {
        if (batch.length > 0) {
            await prisma.user.createMany({ data: batch });
            batch = []; // Reset the batch
        }
    };
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    for (let userId = 501; userId <= totalUsers; userId++) {
        const shouldDelete = Math.random() < 0.25; // 5% chance of being marked for deletion
        batch.push({
                id: userId.toString(),
                email: `user${userId}@gmail.com`,
                emailVerified: true,
                detectionMethods: JSON.stringify(["MODIS", "VIIRS", "LANDSAT"]),
                isPlanetRO: false,
                plan: "basic",
                deletedAt: shouldDelete ? twoMonthsAgo : null,
                signupDate: new Date(),
                roles: "ROLE_CLIENT"
        })
        if(batch.length >= batchSize){
            await processBatch()
        }
    }
    await processBatch()
    console.log(`Successfully Seeded Users`);
}
module.exports.seedUsers = seedUsers;

// seedUsers(2000)
//     .then(() => {
//         console.log('Users seeded successfully.');
//         process.exit(0);
//     })
//     .catch(error => {
//         console.error('Error seeding users', error);
//         process.exit(1);
//     });