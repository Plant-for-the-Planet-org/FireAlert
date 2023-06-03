import { TRPCError } from '@trpc/server';
import { type TRPCContext } from '../../Interfaces/Context'
import { getUserIdByToken } from '../authorization/token';
import { type Project, type Prisma, PrismaClient, type User } from '@prisma/client';
import { fetchProjectsWithSitesForUser, planetUser } from '../fetch';
import { createAlertMethodInPrismaTransaction } from './alertMethod';
import { env } from '../../env.mjs';

const prisma = new PrismaClient();
export const getUser = async (ctx: TRPCContext) => {
    const userId = ctx.token
        ? await getUserIdByToken(ctx)
        : ctx.session?.user?.id;
    if (!userId) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: "User ID not found",
        });
    }
    const user = await ctx.prisma.user.findUnique({
        where: {
            id: userId,
        },
    });
    if (!user) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
        });
    } else {
        return user;
    }
};

export async function getUserBySub(sub: string) {
    const user = await Prisma.user.findFirst({
        where: {
            sub: sub
        }
    });
    if (!user) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: "Cannot find user associated with the token, make sure the user has logged in atleast once",
        });
    }
    return user;
}

interface CreateUserArgs {
    id?: string;
    prisma: Omit<PrismaClient<Prisma.PrismaClientOptions, never, Prisma.RejectOnNotFound | Prisma.RejectPerOperation | undefined>, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use">;
    name: string;
    sub: string;
    email: string;
    emailVerified: boolean;
    image: string;
    isPlanetRO: boolean;
   // detectionMethods: ('MODIS' | 'VIIRS' | 'LANDSAT' | 'GEOSTATIONARY')[];
    remoteId?: string;
}

export async function createUserInPrismaTransaction({ id, prisma, sub, name, email, emailVerified, image, isPlanetRO,remoteId }: CreateUserArgs) {
    const detectionMethods: ('MODIS' | 'VIIRS' | 'LANDSAT' | 'GEOSTATIONARY')[] = ["MODIS", "VIIRS", "LANDSAT"]
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
            remoteId: remoteId
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
        lastLogin: user.lastLogin,
        detectionMethods: user.detectionMethods
    };
}

interface Auth0User {
    sub: string;
    nickname: string;
    name: string;
    picture: string;
    updated_at: string;
    email: string;
    email_verified: boolean;
}

// User Handlers
export async function handleNewUser(ctx: TRPCContext, bearer_token: string) {

    // Fetch user data from Auth0
    const response = await fetch(`${env.AUTH0_DOMAIN}/userinfo`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': bearer_token,
        },
    });
    if (!response.ok) {
        throw new TRPCError({
            code: 'TIMEOUT',
            message: 'Unable to fetch User Details, Please try again later.',
        });
    }
    const userData: Auth0User = await response.json();

    const { sub, name, picture, email, email_verified } = userData;

    const getPlanetUser = await planetUser(bearer_token)
    const isPlanetRO = getPlanetUser.isPlanetRo
    const planetId = getPlanetUser.id

    // Create FireAlert User

    const createdUser:User = await createUserInPrismaTransaction({ prisma, sub, name, image: picture, email, emailVerified: email_verified, isPlanetRO: isPlanetRO, remoteId:planetId })
    await createAlertMethodInPrismaTransaction({ prisma, email, isVerified: email_verified, method: "email", isEnabled: true, userId: createdUser.id })

    if (isPlanetRO) {

        const projects = await fetchProjectsWithSitesForUser(bearer_token)
        if (projects.length > 0) {
            // Find the tpo id and use that as userId
            // const userId = projects[0].properties.tpo.id;
            // Collect project and site data for bulk creation
            const projectData: Project[] = [];
            const siteData: Prisma.SiteCreateManyInput[] = [];
            const remoteIdsForSiteAlerts: string[] = [];
            for (const project of projects) {
                const { id: projectId, name: projectName, slug: projectSlug, sites } = project.properties;
    
                projectData.push({
                    id: projectId,
                    name: projectName ?? "",
                    slug: projectSlug ?? "",
                    userId: createdUser.id,
                    lastUpdated: new Date(),
                });
    
                if (sites) {
                    for (const site of sites) {
                        if (site) {
                            const { id: siteId, name: siteName, geometry: siteGeometry } = site;
                            const siteType = siteGeometry?.type || null; // Use null as the fallback value if siteGeometry is null or undefined
                            const siteRadius = 0;
                            // Check if siteType and siteGeometry are not null before proceeding
                            if (siteType && siteGeometry) {
                                // Check if siteType and siteGeometry.type are the same
                                if (siteType === siteGeometry.type) {
                                    siteData.push({
                                        remoteId: siteId,
                                        origin: 'ttc',
                                        name: siteName ?? "",
                                        type: siteType,
                                        geometry: siteGeometry,
                                        radius: siteRadius,
                                        isMonitored: true,
                                        userId: createdUser.id,
                                        projectId: projectId,
                                        lastUpdated: new Date(),
                                    });
                                    remoteIdsForSiteAlerts.push(siteId)
                                }
                            } else {
                                // Handle the case where geometry or type is null
                                console.log(`Skipping site with id ${siteId} due to null geometry or type.`);
                            }
                        }
                    }
                }
            }
            // Create user and alert method in a transaction
            const result = await ctx.prisma.$transaction(async (prisma: { project: { createMany: (arg0: { data: Project[]; }) => any; }; site: { createMany: (arg0: { data: Prisma.SiteCreateManyInput[]; }) => any; }; $executeRaw: (arg0: Prisma.Sql, arg1: string) => void; }) => {
                const projects = await prisma.project.createMany({
                    data: projectData,
                });
                const sites = await prisma.site.createMany({
                    data: siteData,
                });
                const siteAlertCreationQuery = Prisma.sql`
                INSERT INTO "SiteAlert" (id, "type", "isProcessed", "eventDate", "detectedBy", confidence, latitude, longitude, "siteId", "data", "distance")
                SELECT
                    gen_random_uuid(),
                    e.type,
                    TRUE,
                    e."eventDate",
                    e."identityGroup"::"GeoEventDetectionInstrument",
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
                    AND s."remoteId" IN (${remoteIdsForSiteAlerts.map(() => "?").join(", ")})
                    AND s."isMonitored" IS TRUE
                WHERE
                    e."isProcessed" = TRUE
                    AND NOT EXISTS (
                    SELECT
                        1
                    FROM
                        "SiteAlert"
                    WHERE
                        "SiteAlert"."isProcessed" = FALSE
                        AND "SiteAlert".longitude = e.longitude
                        AND "SiteAlert".latitude = e.latitude
                        AND "SiteAlert"."eventDate" = e."eventDate"
                );
                `;
                // Don't wait for the executeRaw. 
                prisma.$executeRaw(siteAlertCreationQuery, ...remoteIdsForSiteAlerts);
                return {
                    alertMethod: createdAlertMethod,
                    projectsCount: projects.count,
                    sitesCount: sites.count,
                };
            });
            //const createdUser = returnUser(user)
            return {
                status: 'success',
                data: createdUser,
                message: `Successfully created User, Alert Method and added ${sitesCount} sites for ${projectsCount} projects`
            };
        }
    }
}
