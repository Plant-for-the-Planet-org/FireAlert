import {prisma} from '../src/server/db';

// Function to calculate the distance between two points using the Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

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

// Function to extract random 5% of records from the GeoEvent table and create Site records
async function extractAndCreateSites() {
  const totalRecords = await prisma.geoEvent.count(); // Get the total number of records in the GeoEvent table
  const randomRecordsCount = Math.ceil((totalRecords * 5) / 100); // Calculate 5% of the total records

  const randomRecords = await prisma.geoEvent.findMany({
    take: randomRecordsCount, // Extract the required number of random records
    orderBy: {
      id: 'asc', // Order the records by id in ascending order for consistency
    },
  });

  for (const record of randomRecords) {
    const {latitude, longitude} = record;
    const maxDistance = getRandomNumber(1, 10); // Generate a random maxDistance between 1 and 10
    const numVertices = getRandomNumber(3, 5); // Generate a random numVertices between 3 and 5

    const polygon = generatePolygon(
      latitude,
      longitude,
      maxDistance,
      numVertices,
    );

    // Create a Site record using the extracted values and generated polygon
    await prisma.Site.create({
      data: {
        name: 'Generated Site',
        type: 'Polygon',
        geometry: polygon,
        radius: 0,
        isMonitored: true,
        lastUpdated: new Date(),
        userId: '1',
      },
    });
  }
}

// Example usage
extractAndCreateSites()
  .then(() => {
    console.log('Sites created successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error creating sites:', error);
    process.exit(1);
  });
