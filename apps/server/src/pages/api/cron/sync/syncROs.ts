// Organizing the Sync Flow

import { type NextApiRequest, type NextApiResponse } from "next";
import { prisma } from '../../../../server/db';
import { env } from "../../../../env.mjs";
import { logger } from "../../../../server/logger";
import { fetchAllProjectsWithSites } from "../../../../utils/fetch";
import moment from 'moment';
import type { Prisma, Project, Site, User } from "@prisma/client";
import type {  TreeProjectExtended } from '@planet-sdk/common';
import data from "./projects.json"

type SyncOps = {
  projects: { created: number; updated: number; deleted: number };
  users: { created: number; updated: number; deleted: number };
  sites: { created: number; updated: number; deleted: number };
}

type CompareResult = {
  toCreate: any[];
  toUpdate: any[];
  toDelete: any[];
}

export default async function syncROs(req: NextApiRequest, res: NextApiResponse) {
  try {
    // const ops: SyncOps = {
    //   projects: { created: 0, updated: 0, deleted: 0 },
    //   users: { created: 0, updated: 0, deleted: 0 },
    //   sites: { created: 0, updated: 0, deleted: 0 }
    // }

    // // Verify CRON key
    // if (env.CRON_KEY) {
    //   const cronKey = req.query['cron_key'];
    //   if (!cronKey || cronKey !== env.CRON_KEY) {
    //     return res.status(403).json({ message: "Unauthorized: Invalid Cron Key" });
    //   }
    // }

    const ppProjects = data;
    // const ppProjects = await fetchPPProjects();
    // const faData = await fetchFA(ppProjects);
    
    // // Compare data
    // const projectResults = await compareProjects(ppProjects, faData);
    // const siteResults = await compareSites(ppProjects, faData);
    
    // // Execute operations
    // await createQueries(projectResults, siteResults, ops);
    // await updateQueries(projectResults, siteResults, ops);
    // await deleteQueries(projectResults, siteResults, ops);
    
    // // Cleanup
    // cleanUps();

    // logger(`Sync completed - Projects: ${JSON.stringify(ops.projects)}, Sites: ${JSON.stringify(ops.sites)}`, 'info');
    
    return res.status(200).json({
      message: "Success! Data has been synced for RO Users!",
      status: 200,
      // results: ops
      projects: ppProjects[0]
    });
  } catch (error) {
    logger(`Error in sync: ${error}`, "error");
    return res.status(500).json({ error });
  }
}

async function fetchPPProjects(): Promise<TreeProjectExtended[]> {
  return await fetchAllProjectsWithSites();
}

async function fetchFA(ppProjects: TreeProjectExtended[]) {
  // Fetch all RO users
  const roUsers = await prisma.user.findMany({
    where: { isPlanetRO: true },
    select: { id: true, remoteId: true }
  });

  const userIds = roUsers.map(user => user.id);
  const userRemoteIds = roUsers.map(user => user.remoteId);


  const roProjects = await prisma.project.findMany({
    where: { userId: { in: userIds } }
  });

  const roSites = await prisma.site.findMany({
    where: { userId: { in: userIds } }
  });

  // Get PP projects related to RO users
  const projectsByOwner = ppProjects.filter(project => 
    userRemoteIds.includes(project.tpo.id)
  );
  
  const projectsByExisting = ppProjects.filter(project => 
    roProjects.some(rp => rp.id === project.id)
  );

  // Combine without duplicates
  const ppProjectsCombined = [
    ...projectsByOwner,
    ...projectsByExisting.filter(p2 => 
      !projectsByOwner.some(p1 => p1.id === p2.id)
    )
  ];

  logger(`Found ${roUsers.length} RO users, ${roProjects.length} projects, ${roSites.length} sites`, 'info');
  logger(`PP Projects: ${projectsByOwner.length} by owner, ${projectsByExisting.length} existing, ${ppProjectsCombined.length} combined`, 'info');

  return {
    roUsers,
    roProjects,
    roSites,
    ppProjectsCombined,
    maps: {
      userRemoteIdToId: new Map(roUsers.map(u => [u.remoteId, u.id])),
      siteRemoteIdToId: new Map(roSites.map(s => [s.remoteId, s.id]))
    }
  };
}

async function compareProjects(ppProjects: TreeProjectExtended[], faData: any): Promise<CompareResult> {
  const { roProjects } = faData;
  
  const toCreate = ppProjects.filter(pp => 
    !roProjects.some(fa => fa.id === pp.id)
  );
  
  const toUpdate = ppProjects.filter(pp => {
    const faProject = roProjects.find(fa => fa.id === pp.id);
    return faProject && moment(faProject.lastUpdated).isBefore(pp.lastUpdated);
  });

  logger(`Projects to create: ${toCreate.length}, to update: ${toUpdate.length}`, 'info');
  
  return { toCreate, toUpdate, toDelete: [] };
}

async function compareSites(ppProjects: TreeProjectExtended[], faData: any): Promise<CompareResult> {
  const { roSites, maps } = faData;
  
  const ppSites = ppProjects.flatMap(p => p.sites || []);
  const ppSiteIds = ppSites.map(s => s.properties.id);
  
  const toCreate = ppSites.filter(pp => 
    !maps.siteRemoteIdToId.has(pp.properties.id)
  );
  
  const toUpdate = ppSites.filter(pp => {
    const faSite = roSites.find(fa => fa.remoteId === pp.properties.id);
    return faSite && moment(faSite.lastUpdated).isBefore(pp.properties.lastUpdated.date);
  });
  
  const toDelete = roSites.filter(fa => 
    !ppSiteIds.includes(fa.remoteId as string)
  );

  logger(`Sites to create: ${toCreate.length}, to update: ${toUpdate.length}, to delete: ${toDelete.length}`, 'info');
  
  return { toCreate, toUpdate, toDelete };
}

async function createQueries(projectResults: CompareResult, siteResults: CompareResult, ops: SyncOps) {
  logger('Would create projects:', projectResults.toCreate.length);
  logger('Would create sites:', siteResults.toCreate.length);
  
  // Comment out actual creation queries, replace with logs
  /*
  await prisma.project.createMany({
    data: projectResults.toCreate.map(...)
  });
  
  await prisma.site.createMany({
    data: siteResults.toCreate.map(...)
  });
  */
  
  ops.projects.created += projectResults.toCreate.length;
  ops.sites.created += siteResults.toCreate.length;
}

async function updateQueries(projectResults: CompareResult, siteResults: CompareResult, ops: SyncOps) {
  logger('Would update projects:', projectResults.toUpdate.length);
  logger('Would update sites:', siteResults.toUpdate.length);
  
  /*
  for (const project of projectResults.toUpdate) {
    await prisma.project.update({...});
  }
  
  for (const site of siteResults.toUpdate) {
    await prisma.site.update({...});
  }
  */
  
  ops.projects.updated += projectResults.toUpdate.length;
  ops.sites.updated += siteResults.toUpdate.length;
}

async function deleteQueries(projectResults: CompareResult, siteResults: CompareResult, ops: SyncOps) {
  logger('Would soft delete sites:', siteResults.toDelete.length);
  
  /*
  await prisma.site.updateMany({
    where: { id: { in: siteResults.toDelete.map(s => s.id) } },
    data: { projectId: null }
  });
  */
  
  ops.sites.deleted += siteResults.toDelete.length;
}

function cleanUps() {
  // Reset any global variables or clear caches if needed
  logger('Cleanup completed', 'info');
}