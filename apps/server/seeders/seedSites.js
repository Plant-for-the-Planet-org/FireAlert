import { prisma } from '../src/server/db';


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

export async function seedSites(totalUsers, batchSize = 500) {
  const totalSites = totalUsers*5
  const filePath = __dirname + '/data/GeoEvents.csv';
  let siteId = 1;
  let batch = [];

  const processBatch = async () => {
    if (batch.length > 0) {
      await prisma.site.createMany({ data: batch });
      batch = []; // Reset the batch
    }
  };
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(parse({ delimiter: ',' }))
      .on('data', async (row) => {
        if (siteId <= totalSites) {
          const shouldDelete = Math.random() < 0.05; // 5% chance of being marked for deletion
          const latitude = parseFloat(row[0]);
          const longitude = parseFloat(row[1]);
          const maxDistance = getRandomNumber(1, 10);
          const numVertices = getRandomNumber(3, 5);
          const polygon = generatePolygon(latitude, longitude, maxDistance, numVertices);
          const randomUserId = getRandomNumber(1, totalUsers);

          batch.push({
            id: siteId,
            name: `Site ${siteId}`,
            type: 'Polygon',
            geometry: polygon,
            radius: 0,
            isMonitored: true,
            lastUpdated: new Date(),
            userId: randomUserId.toString(),
            deletedAt: shouldDelete ? twoMonthsAgo : null,
          });

          if (batch.length >= batchSize) {
            processBatch(); // Process the current batch
          }
        }
      })
      .on('end', () => {
        resolve();
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// Example usage
seedSites(2000)
  .then(() => {
    console.log('Sites created successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error creating sites:', error);
    process.exit(1);
  });
