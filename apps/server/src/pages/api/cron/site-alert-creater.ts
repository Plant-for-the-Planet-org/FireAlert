// to execute this handler, access the endpoint:  http://localhost:3000/api/cron/site-alert-creater

import { type NextApiRequest, type NextApiResponse } from "next";
import GeoEventProviderClassRegistry from '../../../Services/GeoEventProvider/GeoEventProviderRegistry'
import { type GeoEventProvider } from '@prisma/client'
import { type GeoEventProviderConfig } from '../../../Interfaces/GeoEventProvider'
import { env } from "../../../env.mjs";
import createSiteAlerts from "../../../../src/Services/SiteAlert/CreateSiteAlert";
import { logger } from "../../../../src/server/logger";
import { type GeoEventProviderClientId } from "../../../Interfaces/GeoEventProvider";
import { prisma } from "../../../../src/server/db";
import fs from 'fs';
import path from 'path';

const LOCK_FILE = path.join(__dirname, 'createSiteAlertsCron.lock');

export default async function createSiteAlertsCron(req: NextApiRequest, res: NextApiResponse) {
    if (fs.existsSync(LOCK_FILE)) {
        res.status(423).json({ message: "Another job is running" });
        return;
    }

    fs.closeSync(fs.openSync(LOCK_FILE, 'w'));  // create lock file

    // Verify the 'cron_key' in the request headers before proceeding
    if (env.CRON_KEY) {
        // Verify the 'cron_key' in the request headers
        const cronKey = req.query['cron_key'];
        if (!cronKey || cronKey !== env.CRON_KEY) {
            res.status(403).json({ message: "Unauthorized Invalid Cron Key" });
            return;
        }
    }

    // Set Limit to 7 if not provided or greater than 10
    // Extract limit from query
    const rawLimit = req.query['limit'];

    // Initialize final limit as number
    let limit: number;

    if (typeof rawLimit === 'string') {
        const parsedLimit = parseInt(rawLimit, 10);
        if (isNaN(parsedLimit) || parsedLimit > 15) {
            limit = 15;
        } else {
            limit = parsedLimit;
        }
    } else {
        limit = 4;
    }


    const activeProviders: GeoEventProvider[] = await prisma.$queryRaw`
    SELECT *
    FROM "GeoEventProvider"
    WHERE "isActive" = true
        AND "fetchFrequency" IS NOT NULL
        AND ("lastRun" + ("fetchFrequency" || ' minutes')::INTERVAL) < (current_timestamp AT TIME ZONE 'UTC')
    LIMIT ${limit};
    `;

    let processedProviders = 0;
    let newSiteAlertCount = 0;

    const promises = activeProviders.map(async (provider) => {
        const { config, id: geoEventProviderId, clientId: geoEventProviderClientId, clientApiKey } = provider
        const parsedConfig: GeoEventProviderConfig = JSON.parse(JSON.stringify(config))
        const client = parsedConfig.client
        const geoEventProvider = GeoEventProviderClassRegistry.get(client);
        geoEventProvider.initialize(parsedConfig);
        const slice = parsedConfig.slice;
        const breadcrumbPrefix = `${geoEventProviderClientId} Slice ${slice}:`

        const alertCount = await createSiteAlerts(geoEventProviderId, geoEventProviderClientId as GeoEventProviderClientId, slice)
        logger(`${breadcrumbPrefix} Created ${alertCount} Site Alerts.`, "info");

        newSiteAlertCount += alertCount
    });
    processedProviders += activeProviders.length;
    await Promise.all(promises).catch(error => logger(`Something went wrong in createSiteAlertsCron. ${error}`, "error"));

    fs.unlinkSync(LOCK_FILE);  // remove lock file

    res.status(200).json({
        message: "Cron job executed successfully",
        alertsCreated: newSiteAlertCount,
        processedProviders: processedProviders,
        status: 200
    });
}
