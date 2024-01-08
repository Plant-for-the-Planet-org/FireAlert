import { prisma } from '../src/server/db';

export async function seedUsers(totalUsers, batchSize=500) {
    let batch = [];

    const processBatch = async () => {
        if (batch.length > 0) {
            await prisma.site.createMany({ data: batch });
            batch = []; // Reset the batch
        }
    };
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    for (let userId = 1; userId <= totalUsers; userId++) {
        const shouldDelete = Math.random() < 0.05; // 5% chance of being marked for deletion
        batch.push({
                id: userId.toString(),
                email: `user${userId}@gmail.com`,
                emailVerified: true,
                detectionMethods: JSON.stringify(["MODIS", "VIIRS", "LANDSAT"]),
                isPlanetRO: false,
                plan: "basic",
                deletedAt: shouldDelete ? twoMonthsAgo : null,
        })
        if(batch.length >= batchSize){
            await processBatch()
        }
    }
    await processBatch()
}

seedUsers(2000)
    .then(() => {
        console.log('Users seeded successfully.');
        process.exit(0);
    })
    .catch(error => {
        console.error('Error seeding users', error);
        process.exit(1);
    });