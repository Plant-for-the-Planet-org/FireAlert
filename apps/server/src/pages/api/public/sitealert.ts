// to execute this handler, access the endpoint:  http://localhost:3000/api/public/sitealert

import {type NextApiRequest, type NextApiResponse} from "next";
import {prisma} from '../../../server/db';
import {logger} from "../../../../src/server/logger";
import {getLocalTime} from "../../../utils/date";
import {z} from "zod";
import validator from "validator";

// Run this cron every day once for max 60s.
export const config = {
    maxDuration: 60,
};
const remoteIdSchema = z.string().refine(value => {
    const sanitized = validator.escape(value);
    return sanitized === value;  // Ensure no characters were escaped, indicating no harmful characters were present
}, {
    message: 'remoteId contains invalid characters',
});
export default async function dbCleanup(req: NextApiRequest, res: NextApiResponse) {
    try {
        if(req.method !== "GET"){
            res.status(405).json({message: "Method Not Allowed"});
            return;
        }
        const remoteId = req.query['remoteId'];
        const rawDaysAgo = req.query['durationInDays'];
        if (!remoteId || typeof remoteId !== 'string') {
            res.status(400).json({
                message: `Query must have a valid remoteId`,
                status: 400
            });
            return;
        }
        // Validate remoteId
        const remoteIdValidation = remoteIdSchema.safeParse(remoteId)
        if(!remoteIdValidation.success){
            res.status(400).json({
                message: remoteIdValidation.error.errors.map(e => e.message).join(", "),
                status: 400
            });
            return;
        }
        
        let daysAgo: number = 30;
        if (typeof rawDaysAgo === 'string') {
            const parsedDaysAgo = parseInt(rawDaysAgo, 10);
            daysAgo = isNaN(parsedDaysAgo) || parsedDaysAgo > 365 ? 30 : parsedDaysAgo;
        }
        const site = await prisma.site.findFirst({
            where: {
                remoteId: remoteId as string
            },
            select: {
                id: true
            }
        })

        if(!site){
            res.status(400).json({
                message: `Site Not Found`,
                status: 400
            });
            return;
        }

        const alertsForSite = await prisma.siteAlert.findMany({
            where:{
                siteId: site.id,
                eventDate: {
                    gte: new Date(new Date().getTime() - daysAgo * 24 * 60 * 60 * 1000)
                }
            },
            select: {
                id: true,
                eventDate: true,
                type: true,
                latitude: true,
                longitude: true,
                detectedBy: true,
                confidence: true,
                distance: true,
                data: true,
            }
        })
        const features = alertsForSite.map((alert) => {
            const {latitude, longitude, ...rest} = alert
            const localTime = getLocalTime(alert.eventDate, alert.latitude.toString(), alert.longitude.toString());
            return {
                type: 'Feature',
                properties: {
                    ...rest,
                    localEventDate: localTime.localDate,
                    localTimeZone: localTime.timeZone,
                },
                geometry: {
                    type: 'Point',
                    coordinates: [longitude, latitude]
                }
            };
        });
        const siteAlerts_in_geojson = {
            type: 'FeatureCollection',
            features: features
        };
        res.status(200).json(siteAlerts_in_geojson);

    } catch (error) {
        logger(`Something Went Wrong. ${error}`, "error");
        res.status(500).json({
            message: `Something Went Wrong. ${error}`,
            status: 500
        });
    }
}