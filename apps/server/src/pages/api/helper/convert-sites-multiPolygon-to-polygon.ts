// to execute this handler, access the endpoint:  http://localhost:3000/api/helper/convert-sites-multiPolygon-to-polygon

import {type NextApiRequest, type NextApiResponse} from "next";
import {prisma} from '../../../server/db'
import {env} from "../../../env.mjs";
import {logger} from "../../../../src/server/logger";
import {bulkEmailUsersRegardingMultiPolygonSites} from "../../../utils/notification/siteConversionEmails"
import {createPolygonSitesFromMultiPolygon, UserInfo, CreatePolygonSiteData, MultiPolygonGeometry, SiteCreationParams, MultiPolygonInfo} from "../../../utils/routers/site"

// Run this api once on the production db.
export default async function convertAllMultiPolygonSitesToPolygon(req: NextApiRequest, res: NextApiResponse) {
    // Verify the 'cron_key' in the request headers before proceeding
    if (env.CRON_KEY) {
        // Verify the 'cron_key' in the request headers
        const cronKey = req.query['cron_key'];
        if (!cronKey || cronKey !== env.CRON_KEY) {
            res.status(403).json({ message: "Unauthorized: Invalid Cron Key" });
            return;
        }
    }
    try {        
        // Initialize an empty array createSiteQueue
        const createSiteQueue: CreatePolygonSiteData[] = []
        // Initialize the sendEmailQueue which is an array of objects like {name, email, multiPolygons:[{name, numberOfPolygons}, {...}...]}
        let sendEmailQueue = new Map<string, UserInfo>();
        // MultiPolygonSites = Get all sites whose type is MultiPolygon, select userId, and userEmail from it
        const transaction = await prisma.$transaction(async (prisma) => {
            const multiPolygonSites = await prisma.site.findMany({
                where: {type: 'MultiPolygon'},
                include: {user: true}
            })
            const deleteMultiPolygonSite_Ids = multiPolygonSites.map((site)=>site.id)
            for (const multiPolygonSite of multiPolygonSites){
                const multiPolygonGeometry = multiPolygonSite.geometry as MultiPolygonGeometry
                const polygons = multiPolygonGeometry.coordinates
                const {origin, name, radius, isMonitored, userId, lastUpdated, projectId, remoteId, user} = multiPolygonSite
                const siteCreationParams: SiteCreationParams = {
                    origin: origin,
                    name: name,
                    radius: radius,
                    isMonitored: isMonitored,
                    userId: userId,
                    lastUpdated: lastUpdated,
                    projectId: projectId,
                    remoteId: remoteId,
                };
                const polygonSites = createPolygonSitesFromMultiPolygon(siteCreationParams, multiPolygonGeometry);
                createSiteQueue.push(...polygonSites);
                // Add to sendEmailQueue for each MultiPolygon
                // Each userId is a unique key
                const userInfo = sendEmailQueue.get(userId) || {
                    email: user.email,
                    name: user.name,
                    multiPolygon: [] as MultiPolygonInfo[]
                };
                userInfo.multiPolygon.push({ name: name || '', numberOfPolygons: polygons.length });
                sendEmailQueue.set(userId, userInfo);
            }
            const createdPolygonSites = await prisma.site.createMany({
                data: createSiteQueue
            })
            const deletedMultiPolygonSites = await prisma.site.deleteMany({
                where: {
                    id: {
                        in: deleteMultiPolygonSite_Ids
                    },
                    type: 'MultiPolygon'
                }
            });
            return {
                multiPolygonCount: deletedMultiPolygonSites.count,
                sitesCount: createdPolygonSites.count,
                userCount: sendEmailQueue.size,
            }
        })

        // Send emails to users
        const emailSent = await bulkEmailUsersRegardingMultiPolygonSites(Array.from(sendEmailQueue.values()));
        
        // For each MultiPolygonSites
            // Find the number of polygon that the MultiPolygon has
            // If sendEmailQueue already has an object with this multiPolygon.userId
                // Append {name, numberOfPolygons} to just the  sendEmailQueue.multiPolygons
            // Else
                // Append {userId, multiPolygons:[{name, numberOfPolygons}]} to sendEmailQueue
            // Extract Polygons out of the MultiPolygon
            // for each polygon
                // Make an object with the origin, type, name, geometry:{type:"Polygon",coordinates:Polygon}, radius, isMonitored, userId, lastUpdated, projectId, remoteId
                // Append this object to the createSiteQueue
        // Bulk Create Site using createSiteQueue
        // For each object in sendEmailQueue, construct message, and then send email
        res.status(200).json({
            message: `Successfully created ${transaction.sitesCount} polygon sites from ${transaction.multiPolygonCount} multipolygons for ${transaction.userCount} users. Sent email to ${emailSent.sentCount} users`,
            status: 200,
        });
    } catch (error) {
        logger(`Error during conversion: ${error.message}`, 'error');
        if (error instanceof Error) {
            // Log stack trace for more detailed debugging information
            logger(error.stack, 'error');
        }
        res.status(500).json({
            message: "Something went wrong during cleanup.",
            status: 500,
            error: error.message, // Optionally send back the error message
        });
    }
}
