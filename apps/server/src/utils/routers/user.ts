import {TRPCError} from '@trpc/server';
import {
  type Project,
  Prisma,
  type PrismaClient,
  type User,
} from '@prisma/client';
import {fetchProjectsWithSitesForUser, planetUser} from '../fetch';
import {createAlertMethodInPrismaTransaction} from './alertMethod';
import {env} from '../../env.mjs';
import {prisma} from '../../server/db';

interface CreateUserArgs {
  id?: string;
  prisma: Omit<
    PrismaClient<
      Prisma.PrismaClientOptions,
      never,
      Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined
    >,
    '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'
  >;
  name: string;
  sub: string;
  email: string;
  emailVerified: boolean;
  image: string;
  isPlanetRO: boolean;
  remoteId?: string;
}

export async function createUserInPrismaTransaction({
  id,
  prisma,
  sub,
  name,
  email,
  emailVerified,
  image,
  isPlanetRO,
  remoteId,
}: CreateUserArgs) {
  const detectionMethods: ('MODIS' | 'VIIRS' | 'LANDSAT' | 'GEOSTATIONARY')[] =
    ['MODIS', 'VIIRS', 'LANDSAT'];
  const createdUser = await prisma.user.create({
    data: {
      id: id ? id : undefined,
      sub: sub,
      isPlanetRO: isPlanetRO,
      name: name,
      image: image,
      email: email,
      emailVerified: emailVerified,
      lastLogin: new Date(),
      detectionMethods: detectionMethods,
      remoteId: remoteId,
    },
  });
  return createdUser;
}

export function returnUser(user: User) {
  return {
    id: user.id,
    sub: user.sub,
    email: user.email,
    name: user.name,
    image: user.image,
    isPlanetRO: user.isPlanetRO,
    roles: user.roles,
    lastLogin: user.lastLogin,
    detectionMethods: user.detectionMethods,
  };
}

interface Auth0User {
  sub: string;
  nickname: string;
  name: string;
  picture: string;
  updated_at: string;
  email: string;
  email_verified: string;
}

// User Handlers
export async function handleNewUser(bearer_token: string) {
  // Fetch user data from Auth0
  const response = await fetch(`${env.NEXT_PUBLIC_AUTH0_DOMAIN}/userinfo`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: bearer_token,
    },
  });
  if (!response.ok) {
    throw new TRPCError({
      code: 'TIMEOUT',
      message: 'Unable to fetch User Details, Please try again later.',
    });
  }
  const userData: Auth0User = await response.json();

  const {sub, name, picture, email} = userData;
  // Auth0 has a bug where email_verified is a sometimes string instead of a boolean
  // Therefore check both string and boolean values

  const email_verified = (typeof userData.email_verified === 'boolean' && userData.email_verified) || 
                        (typeof userData.email_verified === 'string' && 
                        userData.email_verified.toLowerCase() === 'true');

  const getPlanetUser = await planetUser(bearer_token);
  const isPlanetRO = getPlanetUser.isPlanetRO;
  const planetId = getPlanetUser.id;

  // Create FireAlert User

  const createdUser: User = await createUserInPrismaTransaction({
    prisma,
    sub,
    name: name,
    image: picture,
    email,
    emailVerified: email_verified,
    isPlanetRO: isPlanetRO,
    remoteId: planetId,
  });
  await createAlertMethodInPrismaTransaction({
    prisma,
    email,
    isVerified: email_verified,
    method: 'email',
    isEnabled: true,
    userId: createdUser.id,
  });
  if (isPlanetRO) {
    const projects = await fetchProjectsWithSitesForUser(bearer_token);
    if (projects.length > 0) {
      // Collect project and site data for bulk creation
      const projectData: Project[] = [];
      const siteData: Prisma.SiteCreateManyInput[] = [];
      const remoteIdsForSiteAlerts: string[] = [];
      for (const project of projects) {
        const {
          id: projectId,
          name: projectName,
          slug: projectSlug,
          sites,
        } = project.properties;

        projectData.push({
          id: projectId,
          name: projectName ?? '',
          slug: projectSlug ?? '',
          userId: createdUser.id,
          lastUpdated: new Date(),
        });

        if (sites) {
          for (const site of sites) {
            if (site) {
              const {
                id: remoteSiteId,
                name: siteName,
                geometry: siteGeometry,
              } = site;
              const siteType = siteGeometry?.type || null; // Use null as the fallback value if siteGeometry is null or undefined
              const siteRadius = 0;
              // Check if siteType and siteGeometry are not null before proceeding
              if (siteType && siteGeometry) {
                // Check if siteType and siteGeometry.type are the same
                if (siteType === siteGeometry.type) {
                  siteData.push({
                    remoteId: remoteSiteId,
                    origin: 'ttc',
                    name: siteName ?? '',
                    type: siteType,
                    geometry: siteGeometry,
                    radius: siteRadius,
                    isMonitored: true,
                    userId: createdUser.id,
                    projectId: projectId,
                    lastUpdated: new Date(),
                  });
                  remoteIdsForSiteAlerts.push(remoteSiteId);
                }
              } else {
                // Handle the case where geometry or type is null
                console.log(
                  `Skipping site with remoteSiteId ${remoteSiteId} due to null geometry or type.`,
                );
              }
            }
          }
        }
      }
      // Bulk create sites, projects and siteAlerts in a prisma transaction
      const result = await prisma.$transaction(async prisma => {
        const projects = await prisma.project.createMany({
          data: projectData,
        });
        const sites = await prisma.site.createMany({
          data: siteData,
        });
        return {
          projectsCount: projects.count,
          sitesCount: sites.count,
        };
      });
      // Fetch the newly created sites using their remoteId values
      const createdSites = await prisma.site.findMany({
        where: {
          remoteId: {
            in: remoteIdsForSiteAlerts,
          },
        },
        select: {
          id: true,
        },
      });
      // Extract the siteIds from the createdSites array
      const siteIds = createdSites.map(site => site.id);
      // Don't wait for the executeRaw.
      const siteAlertsCreationQuery = Prisma.sql`
                INSERT INTO "SiteAlert" (id, "type", "isProcessed", "eventDate", "detectedBy", confidence, latitude, longitude, "siteId", "data", "distance")
                SELECT
                    gen_random_uuid(),
                    e.type,
                    TRUE,
                    e."eventDate",
                    e."geoEventProviderClientId",
                    e.confidence,
                    e.latitude,
                    e.longitude,
                    s.id,
                    e.data,
                    ST_Distance(ST_SetSRID(e.geometry, 4326), s."detectionGeometry") AS distance
                FROM
                    "GeoEvent" e
                    INNER JOIN "Site" s ON ST_Within(ST_SetSRID(e.geometry, 4326), s."detectionGeometry")
                    AND s."deletedAt" IS NULL
                    AND s.id IN (${Prisma.join(siteIds)})
                    AND s."isMonitored" IS TRUE
                WHERE
                    e."isProcessed" = TRUE
                    AND (
                        e.slice = ANY(array(SELECT jsonb_array_elements_text(slices)))
                        OR '0' = ANY(array(SELECT jsonb_array_elements_text(slices)))
                    )
                    AND NOT EXISTS (
                    SELECT
                        1
                    FROM
                        "SiteAlert"
                    WHERE
                        "SiteAlert".longitude = e.longitude
                        AND "SiteAlert".latitude = e.latitude
                        AND "SiteAlert"."eventDate" = e."eventDate"
                )`;
      // todo: remove the await, change false to true in siteAlert isProcessed
      await prisma.$executeRaw(siteAlertsCreationQuery);
      const returnedUser = returnUser(createdUser);
      return {
        status: 'success',
        data: {user: returnedUser},
        message: `Successfully created User, Alert Method and added ${result.sitesCount} sites for ${result.projectsCount} projects.`,
      };
    }
  }
  return {
    status: 'success',
    data: createdUser,
  };
}
