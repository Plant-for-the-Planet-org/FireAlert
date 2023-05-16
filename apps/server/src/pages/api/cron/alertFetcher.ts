// to execute this handler, access the endpoint:  http://localhost:3000/api/cron/alertFetcher
// once this has been tested, it should be moved/modified to comply with Vercel conron job standards

import { NextApiRequest, NextApiResponse } from "next";
import AlertProviderRegistry from '../../../Services/AlertProvider/AlertProviderRegistry'
import AlertProviderConfig from '../../../Services/AlertProvider/AlertProviderConfig'
import { PrismaClient, AlertProvider } from '@prisma/client'
import geoEventEmitter from "../../../Events/EventEmitter/GeoEventEmitter"
import { GEO_EVENT } from "../../../Events/messageConstants"
import { GeoEventsNotificationMessage } from "../../../Events/Messages/GeoEventsNotificationMessage";

export default async function alertFetcher(req: NextApiRequest, res: NextApiResponse) {

  // DEBUG CODE START
  // debugger;
  // try {
  //   const source = 'VIIRS_SNPP_NRT'
  //   const alertProvider = AlertProviderRegistry.get(source)
  //   alertProvider.initialize({ mapKey: '1f98b944d68d560be3a6137e985f5616', apiUrl: 'https://firms.modaps.eosdis.nasa.gov' })
  //   const geoEvents = await alertProvider.getLatestGeoEvents(source);
  //   debugger;
  //   const $a = 1;

  // } catch (error) {
  //   console.log(error)
  // }
  
  // DEBUG CODE END
  const prisma = new PrismaClient()

  // fetch all active provider from AreaProvider table
  const activeProviders: AlertProvider[] = await prisma.alertProvider.findMany({
    where: {
      isActive: true,
    },
  })

  activeProviders.map(provider => {
    const { source, config } = provider
    const alertProvider = AlertProviderRegistry.get(source);
    alertProvider.initialize(config);

    (async () => {
      const geoEvents = await alertProvider.getLatestGeoEvents(source)
      geoEventEmitter.emit(GEO_EVENT.NOTIFICATION, new GeoEventsNotificationMessage(source, geoEvents))
    })()
  })

  res.status(200).json({ message: "Cron job executed successfully" });
}