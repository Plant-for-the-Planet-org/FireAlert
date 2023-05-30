import { TRPCError } from '@trpc/server';
import {CheckUserHasSitePermissionArgs, CheckIfPlanetROSiteArgs} from '../../Interfaces/Site'
import { Site } from '@prisma/client';

// Compares the User in session or token with the Site that is being Read, Updated or Deleted
export const checkUserHasSitePermission = async ({ ctx, siteId, userId }: CheckUserHasSitePermissionArgs) => {
    const siteToCRUD = await ctx.prisma.site.findFirst({
        where: {
            id: siteId,
            deletedAt: null
        }
    });
    if (!siteToCRUD) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: "Site with that id does not exist, cannot update site",
        });
    }
    if (siteToCRUD.userId !== userId) {
        throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not authorized to update this site",
        });
    }
    return siteToCRUD
};

export const checkIfPlanetROSite = async ({ ctx, siteId }: CheckIfPlanetROSiteArgs) => {
    const siteToCRUD = await ctx.prisma.site.findFirst({
        where: {
            id: siteId,
        },
        select: {
            userId: true,
            projectId: true,
        },
    });
    if (siteToCRUD?.projectId) {
        return true
    } else {
        return false
    }
}

export function returnSite(site: Site) {
    return {
        id: site.id,
        name: site.name,
        type: site.type,
        radius: site.radius,
        isMonitored: site.isMonitored,
        lastUpdated: site.lastUpdated,
        project: {
            id: site.projectId?.id,
            name: site.projectId?.name,
        },
        userId: site.userId,
        geometry: site.geometry,
    };
}