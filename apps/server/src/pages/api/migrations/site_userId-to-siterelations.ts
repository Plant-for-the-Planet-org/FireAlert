import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../server/db";

const BATCH_SIZE = 2;
const DELAY = 1000;

function sleep(ms = DELAY) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function migration(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const allSites = await prisma.site.findMany({
      where: {
        userId: { not: null }, // Ensure userId is not null
        siteRelations: { none: {} }, // No associated siteRelations
      },
      select: { id: true, isMonitored: true, userId: true },
    });

    const result = {
      batches: Array<any>([]),
    };
    // batch-processing
    const totalBatches = Math.ceil(allSites.length / BATCH_SIZE);
    for (let i = 0; i < totalBatches; i++) {
      const batch = allSites.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
      try {
        const batchOfSiteRelation: any[] = [];
        batch.forEach((el) => {
          batchOfSiteRelation.push({
            siteId: el.id,
            userId: el.userId as string,
            isActive: el.isMonitored,
          });
        });
        await prisma.siteRelation.createMany({ data: batchOfSiteRelation });
        if (batchOfSiteRelation.length)
          result.batches.push(batchOfSiteRelation);
        console.log(`Batch ${i + 1}/${totalBatches} inserted successfully.`);
      } catch (error) {
        console.error(`Error in batch ${i + 1}:`, error);
      }
      if (i < totalBatches - 1) {
        await sleep(DELAY);
      }
    }
    // batch-processing ends

    return res.status(200).json(result);
  } catch (error) {}
}
