import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../../server/db";
import { getLocalTime } from "../../../../utils/date";


type ResponseData = {
  message: string,
  result?: {
    // site: any,
    fires: any[]
  },

  error?: any
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
        data: true,
      }
    });
    const localizedAlertsForSite = alertsForSite.map((alert) => {
      const localTime = getLocalTime(alert.eventDate, alert.latitude.toString(), alert.longitude.toString());
      return {
        ...alert,
        localEventDate: localTime.localDate,
        localTimeZone: localTime.timeZone,
      }
    })

    res.status(200).json({
      message: 'Success.',
      result:{
        // site: foundSite,
        fires: localizedAlertsForSite
      }
    })
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: 'Failed!', error })
  }
}




// Suggesting these type of utils - We might later need to organise them
function checkMethods(req: NextApiRequest, res: NextApiResponse, allowedMethods: string[]) {
  if (!allowedMethods.includes(req.method)) {
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
