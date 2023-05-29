const fs = require('fs');
const { parse } = require('csv-parse');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


async function seedData() {
    fs.createReadStream(__dirname + '/data/GeoEvents.csv')
        .pipe(parse({ delimiter: ',' }))
        .on('data', async (row) => {
            // Process each row of data and insert it into the database using Prisma
            await prisma.geoEvent.create({
                data: {
                    type: "fire",
                    latitude: parseFloat(row[0]),
                    longitude: parseFloat(row[1]),
                    eventDate: new Date(),
                    confidence: "high",
                    providerKey: "FIRMS",
                    identityGroup: "MODIS",
                    // Map other columns as needed
                },
            });
        })
        .on('end', () => {
            console.log('CSV file successfully processed');
            prisma.$disconnect();
        });
}

seedData()
    .catch((error) => {
        console.error(error);
        prisma.$disconnect();
    });