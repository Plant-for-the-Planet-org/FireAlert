const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fetchIdsFromPostGIS() {

    try {
        const result = await prisma.$queryRawUnsafe`SELECT e.id as eventId, s.id, s.radius, ST_Distance(ST_SetSRID(e.geometry, 4326), s."originalGeometry") as distance
     FROM "GeoEvent" e
     INNER JOIN "Site" s ON st_within(ST_SetSRID(e.geometry, 4326), s."detectionGeometry")
     WHERE e."isProcessed"=false
     limit 5;
    `;
        const rows = result.map(row => console.log(row));
//        const rows = result.map(row => [row.eventId, row.siteId, row.radius, row.distance]);
        //console.log(rows);
        // console.log(eventId, siteId, radius, distance);
    } catch (error) {
        console.error('Error executing the query:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

fetchIdsFromPostGIS();
