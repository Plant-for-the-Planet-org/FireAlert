import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../../../server/db";


type ResponseData = {
  message?: string,
  fires?: GeoJSON.GeoJSON

  error?: object|unknown
}

export default async function firesBySiteHandler(req:NextApiRequest, res:NextApiResponse<ResponseData>) {
  try {

    checkAuthorization(req, res);
    checkMethods(req, res, ['GET']);

    const siteId = req.query.siteId as string;
    if(!siteId)
      return res.status(400).json({ message: 'No siteId provided.' });

    const foundSite = await prisma.site.findFirst({where: {id: siteId}});
    if(!foundSite)
      return res.status(404).json({ message: 'Site not found.' });

    let duration = 1;
    if (req.query.duration && typeof req.query.duration === 'string' && !isNaN(+(req.query.duration))) {
      duration = +(req.query.duration);
    }

    const alertsForSite = await prisma.siteAlert.findMany({
      where:{
        siteId: siteId,
        eventDate: {
          gte: new Date(new Date().getTime() - duration * 24 * 60 * 60 * 1000)
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

      }
    });

    const fires = generateGeoJson(
      alertsForSite.map(alert => ({
        id: alert.id,
        eventDate: alert.eventDate,
        type: alert.type,
        detectedBy: alert.detectedBy,
        confidence: alert.confidence,
        distance: alert.distance
      })),
      alertsForSite.map(alert => ({
        type: "Point",
        coordinates: [alert.longitude, alert.latitude]
      })),
    )

    res.setHeader(
      'Cache-Control',
      'public, s-maxage=10800, stale-while-revalidate=86400'
    );
    res.status(200).json({
      fires
    })
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: 'Failed!', error })
  }
}




// Suggesting these type of utils - We might later need to organise them
function checkMethods(req: NextApiRequest, res: NextApiResponse, allowedMethods: string[]) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  if (!allowedMethods.includes(req.method!)) {
    return res.status(405).json({message: 'Method Not Allowed'})
  }
}

function checkAuthorization(req: NextApiRequest, res: NextApiResponse) {
  const authorization = req.headers.authorization;
  const accessToken = authorization?.split(' ')[1];
  if (!accessToken) {
    return res.status(401).json({message: 'Unauthorized'})
  }

  // Some token verification mechanism...

}



export function generateGeoJson(properties: GeoJSON.GeoJsonProperties[] = [], points: GeoJSON.Point[] = []) {
  const geoJson : GeoJSON.GeoJSON = {
    type: "FeatureCollection",
    features: []
  }

  if (!properties.length  || !points.length) {
    throw new Error("Properties and geometries should have valid values.")
  }

  if (properties.length !== points.length) {
    throw new Error("Properties and geometries length should be equal.")
  }


  for (let i = 0; i < properties.length; i++) {
    geoJson.features.push({
      type: "Feature",
      properties: properties[i],
      geometry: points[i]
    })
  }

  return geoJson;
}
