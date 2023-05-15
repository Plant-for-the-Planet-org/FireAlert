// to execute this handler, access the endpoint:  http://localhost:3000/api/cron/alertFetcher
// once this has been tested, it should be moved/modified to comply with Vercel conron job standards

import { NextApiRequest, NextApiResponse } from "next";
import AlertProviderRegistry from '../../../Services/AlertProvider/AlertProviderRegistry'
import AlertProviderConfig from '../../../Services/AlertProvider/AlertProviderConfig'
import { PrismaClient, AlertProvider } from '@prisma/client'

export default async function alertFetcher(req: NextApiRequest, res: NextApiResponse) {

  debugger;
  const prisma = new PrismaClient()

  // fetch all active provider from AreaProvider table
  const activeProviders: AlertProvider[] = await prisma.alertProvider.findMany({
    where: {
      isActive: true,
    },
  })
  // foreach provider ... 
  activeProviders.map(provider => {
    // TODO: figure out how to the config should be stored in DB and how to convert it to a AlertProviderConfig
    const { source, config } = provider
    const alertProvider = AlertProviderRegistry.get(source)
    alertProvider.initialize(config)
    const currentEvents = fetchCurrentEventIds(provider.slug) // we must define how providers are being distinguished
    const fetchedEvents = alertProvider.getLatestAlerts(source)

    // determine new events and store in DB

    // determine obsolete events and update their status in DB (set to 'obsolete')

  })

  res.status(200).json({ message: "Cron job executed successfully" });
}

const fetchCurrentEventIds = function (source: string) {
  // the the ids of all events from AreaEvent that are either 'pending' or 'notfied'
  // having the provided providerKey
}