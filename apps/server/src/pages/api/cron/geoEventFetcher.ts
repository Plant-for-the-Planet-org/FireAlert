// to execute this handler, access the endpoint:  http://localhost:3000/api/cron/alertFetcher
// once this has been tested, it should be moved/modified to comply with Vercel conron job standards

import { NextApiRequest, NextApiResponse } from "next";
import GeoEventProviderRegistry from '../../../Services/GeoEventProvider/GeoEventProviderRegistry'
import GeoEventProviderConfig from '../../../Services/GeoEventProvider/GeoEventProviderConfig'
import { PrismaClient, GeoEventProvider } from '@prisma/client'
import geoEventEmitter from '../../../Events/EventEmitter/GeoEventEmitter'
import { GEO_EVENTS_CREATED } from '../../../Events/messageConstants'
import { GeoEventsCreatedMessage } from '../../../Events/Messages/GeoEventsCreatedMessage'

export default async function alertFetcher(req: NextApiRequest, res: NextApiResponse) {

  // DEBUG CODE START
  // debugger;
  // try {
  //   const source = 'VIIRS_SNPP_NRT'
  //   const geoEventProvider = GeoEventProviderRegistry.get(source)
  //   geoEventProvider.initialize({ mapKey: '1f98b944d68d560be3a6137e985f5616', apiUrl: 'https://firms.modaps.eosdis.nasa.gov' })
  //   const geoEvents = await geoEventProvider.getLatestGeoEvents(source);
  //   debugger;
  //   const $a = 1;

  // } catch (error) {
  //   console.log(error)
  // }

  // DEBUG CODE END
  const prisma = new PrismaClient()

  // fetch all active provider from AreaProvider table
  const activeProviders: GeoEventProvider[] = await prisma.geoEventProvider.findMany({
    where: {
      isActive: true,
    },
  })

  activeProviders.map(provider => {
    const { source, config } = provider
    const geoEventProvider = GeoEventProviderRegistry.get(source);
    geoEventProvider.initialize(config);

    (async () => {
      const geoEvents = await geoEventProvider.getLatestGeoEvents(source)
      geoEventEmitter.emit(GEO_EVENTS_CREATED, new GeoEventsCreatedMessage(source, geoEvents))
    })()
  })

  res.status(200).json({ message: "Cron job executed successfully" });
}
