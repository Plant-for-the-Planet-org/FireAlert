const fs = require('fs');
const { parse } = require('csv-parse');
const db = require('./db');


function getRandomDate(startDate, endDate) {
  return new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
}

async function seedGeoEvents(totalGeoEvents, batchSize = 10000) {
  const prisma = await db.prisma; // Await the prisma instance
  const filePath = __dirname + '/data/GeoEvents.csv';
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  let batch = [];
  let createdRecords = 0;

  const processBatch = async () => {
    if (batch.length > 0) {
      const recordsToInsert = batch.splice(0, batchSize);
      await prisma.geoEvent.createMany({ data: recordsToInsert });
      createdRecords += recordsToInsert.length;
    }
  };

  while (createdRecords < totalGeoEvents) {
    await new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath)
        .pipe(parse({ delimiter: ',' }))
        .on('data', (row) => {
          if (createdRecords < totalGeoEvents) {
            batch.push({
              type: 'fire',
              latitude: parseFloat(row[0]),
              longitude: parseFloat(row[1]),
              eventDate: getRandomDate(twoMonthsAgo, new Date()),
              confidence: 'high',
              isProcessed: true,
              geoEventProviderClientId: 'LANDSAT_NRT',
              geoEventProviderId: '4',
              slice: '4',
            });
          }

          if (batch.length >= batchSize) {
            stream.pause(); // Pause the stream
            processBatch().then(() => {
              stream.resume(); // Resume the stream
              if (createdRecords >= totalGeoEvents) {
                resolve();
              }
            });
          }
        })
        .on('end', () => {
          processBatch().then(resolve);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }
  console.log(`Total ${createdRecords} GeoEvent records created.`);
  prisma.$disconnect();
}
module.exports.seedGeoEvents = seedGeoEvents;

// Example usage with 5000 records and 500 batchSize
// seedGeoEvents(5000, 500)
// .then(() => {
//   console.log('GeoEvents seeded successfully.');
//   process.exit(0);
// })
// .catch(error => {
//   console.error('Error seeding geoEvents', error);
//   prisma.$disconnect();
//   process.exit(1);
// });
