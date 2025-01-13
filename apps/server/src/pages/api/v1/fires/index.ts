import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../../server/db";
import { logger } from "../../../../server/logger";
import * as process from "node:process";



type ResponseData =
  | GeoJSON.GeoJSON
  | {
      message?: string;
      error?: object | unknown;
    };

let CACHING = true;
if(process.env.PUBLIC_API_CACHING && process.env.PUBLIC_API_CACHING?.toLowerCase() === "false") {
  CACHING = false;
}

export default async function firesBySiteHandler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  try {
    checkCORS(req, res);
    checkMethods(req, res, ["GET"]);

    let siteId = req.query.siteId as string;
    const remoteId = req.query.remoteId as string;

    if (!siteId && !remoteId)
      return res.status(400).json({ message: "No site provided." });

    const foundSite = await prisma.site.findFirst({ where: { OR: [{ id: siteId }, { remoteId: remoteId }] } });
    if (!foundSite) return res.status(404).json({ message: "Site not found." });
    siteId = foundSite.id

    const span = handleParameter_span(req.query.span?.toString());

    const alertsForSite = await prisma.siteAlert.findMany({
      where: {
        siteId: siteId,
        eventDate: {
          gte: span,
        },
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
      },
    });

    const fires = generateGeoJson(
      alertsForSite.map((alert) => ({
        id: alert.id,
        eventDate: alert.eventDate,
        type: alert.type,
        detectedBy: alert.detectedBy,
        confidence: alert.confidence,
        distance: alert.distance,
      })),
      alertsForSite.map((alert) => ({
        type: "Point",
        coordinates: [alert.longitude, alert.latitude],
      }))
    );

    if(CACHING) {
      res.setHeader(
        "Cache-Control",
        "public, max-age=7200 s-maxage=3600, stale-while-revalidate=7200"
      );
      res.setHeader("CDN-Cache-Control", "max-age=7200");
      res.setHeader("Cloudflare-CDN-Cache-Control", "max-age=7200");
    }

    res.status(200).json(fires);
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Failed!", error });
  }
}

// Suggesting these type of utils - We might later need to organise them
function checkMethods(
  req: NextApiRequest,
  res: NextApiResponse,
  allowedMethods: string[]
) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  if (!allowedMethods.includes(req.method!)) {
    return res.status(405).json({ message: "Method Not Allowed" });
  }
}

function checkCORS(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
}

function checkAuthorization(req: NextApiRequest, res: NextApiResponse) {
  const authorization = req.headers.authorization;
  const accessToken = authorization?.split(" ")[1];
  if (!accessToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Some token verification mechanism...
}

export function handleParameter_span(span?: string) {
  let spanToDate = new Date();
  switch (span?.toLowerCase()) {
    case "24h":
      spanToDate = new Date(spanToDate.getTime() - 1000 * 60 * 60 * 24);
      break;
    case "7d":
      spanToDate = new Date(spanToDate.getTime() - 1000 * 60 * 60 * 24 * 7);
      break;
    case "30d":
      spanToDate = new Date(spanToDate.getTime() - 1000 * 60 * 60 * 24 * 30);
      break;
    case "1y":
      spanToDate = new Date(spanToDate.getTime() - 1000 * 60 * 60 * 24 * 365);
      break;
    default:
      logger("Does not match any possible values, using default 7D", "Log");
      spanToDate = new Date(spanToDate.getTime() - 1000 * 60 * 60 * 24 * 7);
  }

  return spanToDate;
}

export function generateGeoJson(
  properties: GeoJSON.GeoJsonProperties[] = [],
  points: GeoJSON.Point[] = []
) {
  const geoJson: GeoJSON.GeoJSON = {
    type: "FeatureCollection",
    features: [],
  };

  if (!properties.length || !points.length) {
    // throw new Error("Properties and geometries should have valid values.")
  }

  if (properties.length !== points.length) {
    // throw new Error("Properties and geometries length should be equal.")
  }

  for (let i = 0; i < properties.length; i++) {
    geoJson.features.push({
      type: "Feature",
      properties: properties[i],
      geometry: points[i],
    });
  }

  return geoJson;
}
