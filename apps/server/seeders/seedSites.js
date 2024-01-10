const db = require('./db');

// Function to generate the GeoJSON polygon
function generatePolygon(latitude, longitude, maxDistance, vertices) {
  const polygon = {
    type: 'Polygon',
    coordinates: [[]],
  };

  // Generate the polygon vertices
  for (let i = 0; i < vertices; i++) {
    const angle = (360 / vertices) * i;
    const vertexLat = latitude + (maxDistance / 111) * Math.cos(angle);
    const vertexLon = longitude + (maxDistance / 111) * Math.sin(angle);
    polygon.coordinates[0].push([vertexLon, vertexLat]);
  }

  // Close the polygon by adding the first vertex at the end
  polygon.coordinates[0].push(polygon.coordinates[0][0]);

  return polygon;
}

// - from the GeoEvent table, randomly pick a certain number of records
// - for each record
//   - calculate a random distance and a random number of vertices between 3 an 6

// Function to generate a random number between min and max (inclusive)
function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedSites(totalUsers, batchSize = 500) {
  const prisma = await db.prisma; // Await the prisma instance
  const totalSites = totalUsers * 5
  let batch = [];

  const processBatch = async () => {
    if (batch.length > 0) {
      await prisma.site.createMany({ data: batch });
      batch = []; // Reset the batch
    }
  };
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);


  for (let siteId = 1; siteId <= totalSites; siteId++) {
    const shouldDelete = Math.random() < 0.05; // 5% chance of being marked for deletion
    const randomUserId = getRandomNumber(1, totalUsers);

    batch.push({
      id: siteId.toString(),
      name: `Site ${siteId}`,
      type: 'Polygon',
      geometry: { "type": "Polygon", "coordinates": [[[-8.896012, 9.1814909997024], [-8.896012, 9.4829459996931], [-8.6362109999999, 9.4829459996931], [-8.6362109999999, 9.1814909997024], [-8.896012, 9.1814909997024]]] },
      radius: 0,
      isMonitored: true,
      lastUpdated: new Date(),
      userId: randomUserId.toString(),
      deletedAt: shouldDelete ? twoMonthsAgo : null,
    })
    if (batch.length >= batchSize) {
      await processBatch()
    }
  }
  await processBatch()
  console.log(`Successfully Seeded Sites`);
}
module.exports.seedSites = seedSites;

// Example usage
// seedSites(2000)
//   .then(() => {
//     console.log('Sites created successfully.');
//     process.exit(0);
//   })
//   .catch(error => {
//     console.error('Error creating sites:', error);
//     process.exit(1);
//   });
