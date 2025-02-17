import {TRPCError} from "@trpc/server";
import {createProtectedSiteSchema, createSiteSchema, findProtectedSiteParams, getSitesWithProjectIdParams, joinProtectedSiteParams, params, pauseAlertInputSchema, updateProtectedSiteSchema, updateSiteSchema} from '../zodSchemas/site.schema'
import {
    createTRPCRouter,
    protectedProcedure,
} from "../trpc";
import {checkUserHasSitePermission, checkIfPlanetROSite, triggerTestAlert} from '../../../utils/routers/site'
import type {Prisma, Site, SiteAlert, SiteRelation} from "@prisma/client";
import { filterByName, getByExternalId } from "./sample-utils";
// import {UserPlan} from "../../../Interfaces/AlertMethod";

const pp_api = process.env.NEXT_PUBLIC_PROTECTED_PLANET_ENDPOINT as string;
const pp_api_key = process.env.NEXT_PUBLIC_PROTECTED_PLANET_API_KEY as string;

export const siteRouter = createTRPCRouter({

    createSite: protectedProcedure
        .input(createSiteSchema)
        .mutation(async ({ctx, input}) => {
            const userId = ctx.user!.id;
            try {
                const origin = 'firealert';
                const lastUpdated = new Date();
                let radius = 0;
                // radius 0 on Point would generally not return any results
                // So monitor 1km around the point by default

                if (input.type === 'Point' && input.radius === 0) {
                    radius = 1000;
                }
                else {
                    radius = input.radius;
                }

                // Convert geometry to GeoJSON string for PostGIS function
                const geometryGeoJSON = JSON.stringify(input.geometry);

                // Calculate detection area using PostGIS
                const result = await ctx.prisma.$queryRaw`SELECT ST_Area(
                    ST_Transform(
                        ST_Buffer(
                        ST_Transform(
                            ST_SetSRID(
                            ST_GeomFromGeoJSON(${geometryGeoJSON}::text),
                            4326
                            ),
                            3857
                        ),
                        ${input.radius}
                        ),
                        3857
                    )
                    ) AS area`;

                const detectionArea = result[0].area; // Assuming result is an array with the area as its first item

                // Check if the detection area exceeds 1 million hectares (10,000 square kilometers)
                if (detectionArea > 1e10) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Site area exceeds the maximum allowed size of 1 million hectares.',
                });
                }
                const site = await ctx.prisma.site.create({
                    data: {
                        origin: origin,
                        type: input.type,
                        name: input.name,
                        geometry: input.geometry,
                        radius: radius,
                        isMonitored: input.isMonitored,
                        userId: userId,
                        lastUpdated: lastUpdated,
                    },
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        radius: true,
                        isMonitored: true,
                        lastUpdated: true,
                        userId: true,
                        remoteId: true,
                        project: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        geometry: true,
                    },
                });

                return {
                    status: "success",
                    data: site,
                };
            } catch (error) {
                console.log(error);
                if (error instanceof TRPCError) {
                    // if the error is already a TRPCError, just re-throw it
                    throw error;
                }
                // if it's a different type of error, throw a new TRPCError
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Something Went Wrong`,
                });
            }
        }),

    findProtectedSites: protectedProcedure
        .input(findProtectedSiteParams)
        .query(async ({ctx, input}) => {
            const userId = ctx.user!.id;
            try {
                const {query} = input;
                const results = filterByName(query)
                
                // const sites = await ctx.prisma.site.findMany({
                //     where: {
                //         userId: userId,
                //         deletedAt: null,
                //         kind: 'PROTECTED_SITE',
                //     },
                //     select: {
                //         id: true,
                //         name: true,
                //         type: true,
                //         radius: true,
                //         isMonitored: true,
                //         lastUpdated: true,
                //         userId: true,
                //         remoteId: true,
                //         project: {
                //             select: {
                //                 id: true,
                //                 name: true
                //             }
                //         },
                //         geometry: true,
                //     }
                // })

                return {
                    status: 'success',
                    data: results,
                };
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: `${error}`,
                });
            }
        }),

    createProtectedSite: protectedProcedure
        .input(createProtectedSiteSchema)
        .mutation(async ({ctx, input}) => {
            const userId = ctx.user!.id;
            try {
                const {externalId} = input

                const origin = 'firealert';

                // radius 0 on Point would generally not return any results
                // So monitor 1km around the point by default
                // if (input.type === 'Point' && input.radius === 0) {
                //     radius = 1000;
                // } else { radius = input.radius; }

                const ppSite = getByExternalId(externalId)

                // Any check by externalId?
                // const protectedArea: {name: string, wdpa_id: string, geometry?: GeoJSON.Geometry} = {
                //     name: "", wdpa_id: ""
                // };
                // const qs = new URLSearchParams();
                // qs.append("token", pp_api_key);
                // qs.append("with_geometry", "true");
                // const { externalId } = input;
                // const pp_url = `${pp_api}/protected_areas/${externalId!}?${qs.toString()}`;

                // const res = await fetch(pp_url);
                // if (!res.ok) {
                //     throw new TRPCError({
                //         code: 'INTERNAL_SERVER_ERROR',
                //         message: `Something Went Wrong`,
                //         cause: res,
                //     })
                // }

                // const data = (await res.json())?.protected_area;
                // if (data) {
                //     protectedArea.name = data?.name as string;
                //     protectedArea.wdpa_id = data?.wdpa_id?.toString() as string;
                //     protectedArea.geometry = data?.geojson.geometry as GeoJSON.Geometry;
                // } else {
                //     throw new TRPCError({
                //         code: "NOT_FOUND",
                //         message: `No protected area found with WDPA ID ${externalId!}.`
                //     })
                // }

                // const site = await ctx.prisma.site.create({
                //     data: {
                //         origin: origin,
                //         type: input.type,
                //         name: protectedArea.name,
                //         radius: radius,
                //         kind: 'PROTECTED_SITE',
                //         geometry: protectedArea.geometry as unknown as Prisma.JsonObject,
                //         externalId: protectedArea.wdpa_id,
                //         lastUpdated: new Date(),
                //         siteRelations: {
                //             create: {
                //                 user: { connect: { id: userId, } },
                //                 role: 'ROLE_VIEWER',
                //             }
                //         },
                //     },
                //     select: {
                //         id: true,
                //         type: true,
                //         name: true,
                //         radius: true,
                //         geometry: true,
                //         externalId: true,
                //         lastUpdated: true,
                //         project: {
                //             select: { id: true, name: true }
                //         },
                //         siteRelations: {
                //             select: { siteId: true, userId: true, role: true }
                //         }
                //     },
                // });

                if(!ppSite) {
                    throw new TRPCError({
                        code: "NOT_FOUND",
                        message: `No protected area found with WDPA ID ${externalId}.`
                    })
                } 
                    
                const foundSite = await ctx.prisma.site.findFirst({
                    where: {externalId: externalId},
                })

                let site: Partial<Site>, siteRelation: Partial<SiteRelation>;
                if(foundSite) {
                    const _foundSiteRelation = await ctx.prisma.siteRelation.findFirst({
                        where: { userId: userId, siteId: foundSite.id },
                    })
                    if (_foundSiteRelation) {
                        site = foundSite;
                        siteRelation = _foundSiteRelation
                    } else {
                        const _siteRelation = await ctx.prisma.siteRelation.create({
                            data: {
                                    role: "ROLE_VIEWER",
                                    userId: userId,
                                    siteId: foundSite.id,
                                isActive: true
                            },
                            select: {
                                siteId: true, userId: true, role: true,
                                site: {
                                    select: {
                                        id: true,
                                        type: true,
                                        name: true,
                                        radius: true,
                                        geometry: true,
                                        externalId: true,
                                    }
                                }
                            }
                        })
                        site = foundSite;
                        siteRelation = _siteRelation
                    }
                } else {
                    const _site = await ctx.prisma.site.create({
                        data: {
                            origin: origin,
                            type: 'Polygon',
                            name: ppSite.name,
                            radius: 0,
                            kind: 'PROTECTED_SITE',
                            geometry: ppSite.geometry as unknown as Prisma.JsonObject,
                            externalId: ppSite.externalId,
                            lastUpdated: new Date(),
                            siteRelations: {
                                create: {
                                    user: { connect: { id: userId, } },
                                    role: 'ROLE_VIEWER',
                                }
                            },
                        },
                        select: {
                            id: true,
                            type: true,
                            name: true,
                            radius: true,
                            geometry: true,
                            externalId: true,
                            lastUpdated: true,
                            project: {
                                select: { id: true, name: true }
                            },
                            siteRelations: {
                                select: { siteId: true, userId: true, role: true }
                            }
                        },
                    });
                    site = _site;
                    siteRelation = _site.siteRelations
                }

                return {
                    status: "success",
                    data: {
                        site,
                        siteRelation
                    },
                };
            } catch (error) {
                console.log(error);
                if (error instanceof TRPCError) {
                    // if the error is already a TRPCError, just re-throw it
                    throw error;
                }
                // if it's a different type of error, throw a new TRPCError
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Something Went Wrong`,
                });
            }
        }),

    joinProtectedSite: protectedProcedure
        .input(joinProtectedSiteParams)
        .mutation(async ({ctx, input}) => {
            const userId = ctx.user!.id;
            let siteId = input.siteId;
            const externalId:string = input.externalId!;
            try {

                if (externalId) {
                  const site = await ctx.prisma.site.findFirst({
                    where: {externalId: externalId},
                  })

                  if(site)
                    siteId = site?.id;
                }

                const foundSiteRelation = await ctx.prisma.siteRelation.findFirst({
                    where: {
                        userId: userId,
                        siteId: siteId,
                        isActive: true
                    },
                    select: {
                        siteId: true, userId: true, role: true,
                        site: {
                            select: {
                                id: true,
                                type: true,
                                name: true,
                                radius: true,
                                geometry: true,
                                externalId: true,
                            }
                        }
                    }
                })

                if (foundSiteRelation) {
                    return {
                        status: 'success',
                        data: foundSiteRelation,
                    };
                }


                const siteRelation = await ctx.prisma.siteRelation.create({
                    data: {
                        role: "ROLE_VIEWER",
                        userId: userId,
                        siteId: siteId
                    },
                    select: {
                        siteId: true, userId: true, role: true,
                        site: {
                            select: {
                                id: true,
                                type: true,
                                name: true,
                                radius: true,
                                geometry: true,
                                externalId: true,
                            }
                        }
                    }
                })

                return {
                    status: 'success',
                    data: siteRelation,
                };
            } catch (error) {
                console.log(error);
                if (error instanceof TRPCError) {
                    // if the error is already a TRPCError, just re-throw it
                    throw error;
                }
                // if it's a different type of error, throw a new TRPCError
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Something Went Wrong`,
                });
            }
        }),


    getSitesForProject: protectedProcedure
        .input(getSitesWithProjectIdParams)
        .query(async ({ctx, input}) => {
            const userId = ctx.user!.id;
            try {
                // Only returns a list of sites if the user has sites with the inputted projectId, else returns not found.
                // TODO: test when this returns an empty array, and when it throws an error.
                const sitesForProject = await ctx.prisma.site.findMany({
                    where: {
                        projectId: input.projectId,
                        deletedAt: null,
                        userId: userId,
                    },
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        radius: true,
                        isMonitored: true,
                        lastUpdated: true,
                        userId: true,
                        remoteId: true,
                        project: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        geometry: true,
                    }
                })
                return {
                    status: 'success',
                    data: sitesForProject,
                };
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: `${error}`,
                });
            }
        }),

    getSites: protectedProcedure
        .query(async ({ctx}) => {
            const userId = ctx.user!.id;
            try {
                const sites = await ctx.prisma.site.findMany({
                    where: {
                        userId: userId,
                        deletedAt: null,
                    },
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        radius: true,
                        isMonitored: true,
                        lastUpdated: true,
                        userId: true,
                        remoteId: true,
                        project: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        geometry: true,
                    }
                })
                return {
                    status: 'success',
                    data: sites,
                };
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: `${error}`,
                });
            }
        }),

    getSite: protectedProcedure
        .input(params)
        .query(async ({ctx, input}) => {
            const userId = ctx.user!.id;
            try {
                await checkUserHasSitePermission({ ctx, siteId: input.siteId, userId: userId });
                const site = await ctx.prisma.site.findFirst({
                    where: {
                        id: input.siteId,
                        deletedAt: null
                    },
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        radius: true,
                        isMonitored: true,
                        lastUpdated: true,
                        userId: true,
                        remoteId: true,
                        project: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        geometry: true,
                    }
                })
                if (site) {
                    return {
                        status: 'success',
                        data: site,
                    }
                } else {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: `Cannot find a site with that siteId for the user associated with the ${ctx.token ? 'token' : 'session'}!`
                    });
                }
            } catch (error) {
                console.log(error)
                if (error instanceof TRPCError) {
                    // if the error is already a TRPCError, just re-throw it
                    throw error;
                }
                // if it's a different type of error, throw a new TRPCError
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Something Went Wrong`,
                });
            }
        }),

    updateSite: protectedProcedure
        .input(updateSiteSchema)
        .mutation(async ({ctx, input}) => {
            const userId = ctx.user!.id;
            const site = await checkUserHasSitePermission({ ctx, siteId: input.params.siteId, userId: userId });
            if (!site) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Site with that id does not exist, cannot update site",
                });
            }
            try {
                let updatedData = input.body
                // Initialize data
                let data: Prisma.SiteUpdateInput = updatedData;
                // If Site is associated with PlanetRO User then don't allow changes on fields other than radius and isMonitored
                const isPlanetROSite = await checkIfPlanetROSite({ ctx, siteId: input.params.siteId })
                if (isPlanetROSite) {
                    const { geometry, type, name, ...rest } = updatedData;
                    if (geometry || type || name) {
                        throw new TRPCError({
                            code: "UNAUTHORIZED",
                            message: `PlanetRO Users can only update Radius and isMonitored Field`,
                        });
                    }
                    data = rest;
                }
                // Update the site using the modified data object
                const updatedSite = await ctx.prisma.site.update({
                    where: {
                        id: input.params.siteId,
                    },
                    data: data,
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        radius: true,
                        isMonitored: true,
                        lastUpdated: true,
                        userId: true,
                        remoteId: true,
                        project: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        geometry: true,
                    }
                });
                return {
                    status: 'success',
                    data: updatedSite,
                };

            } catch (error) {
                console.log(error);
                if (error instanceof TRPCError) {
                    // if the error is already a TRPCError, just re-throw it
                    throw error;
                }
                // if it's a different type of error, throw a new TRPCError
                throw new TRPCError({
                    code: "CONFLICT",
                    message: `Error Updating Site.`,
                });
            }
        }),

    updateProtectedSite: protectedProcedure
        .input(updateProtectedSiteSchema)
        .mutation(async ({ctx, input}) => {
            const userId = ctx.user!.id;
            const siteId = input.params.siteId;
            try {
                const updatedSite = await ctx.prisma.siteRelation.updateMany({
                    where: { siteId: siteId, userId: userId },
                    data: {
                        isActive: input.body.isActive
                    },
                })
                if(updatedSite.count != 1) { return { status: 'failed' }; }

                const activeSiteRelations = await ctx.prisma.siteRelation.findMany({
                    where: { siteId: input.params.siteId, isActive:true }
                })
                if(activeSiteRelations.length === 0) {
                    await ctx.prisma.site.update({
                        where: {id: siteId}, data: {isMonitored: false}
                    })
                }

                return { status: 'success' };
            } catch (error) {
                console.log(error);
                if (error instanceof TRPCError) {
                    // if the error is already a TRPCError, just re-throw it
                    throw error;
                }
                // if it's a different type of error, throw a new TRPCError
                throw new TRPCError({
                    code: "CONFLICT",
                    message: `Error Updating Site.`,
                });
            }
        }),

    triggerTestAlert: protectedProcedure
        .input(params)
        .query(async ({ctx, input}) => {
            const userId = ctx.user!.id;
            const site = await checkUserHasSitePermission({ ctx, siteId: input.siteId, userId: userId });
            if (!site) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Site with that id does not exist, cannot trigger alert",
                });
            }
            try {
                const alert: SiteAlert = await triggerTestAlert(input.siteId)
                return {
                    status: 'success',
                    data: alert,
                };
            } catch (error) {
                console.log(error);
                if (error instanceof TRPCError) {
                    // if the error is already a TRPCError, just re-throw it
                    throw error;
                }
                // if it's a different type of error, throw a new TRPCError
                throw new TRPCError({
                    code: `INTERNAL_SERVER_ERROR`,
                    message: `Something Went Wrong`,
                });
            }
        }),

    pauseAlertForSite: protectedProcedure
        .input(pauseAlertInputSchema)
        .mutation(async ({ctx, input}) => {
            try {
                // Destructure input parameters, including siteId
                const {siteId, duration, unit} = input;

                // Calculate the time for the stopAlertUntil field based on unit
                const additionFactor = {
                minutes: 1000 * 60,
                hours: 1000 * 60 * 60,
                days: 1000 * 60 * 60 * 24,
                };

                // Calculate future date based on current time, duration, and unit
                const futureDate = new Date(Date.now() + duration * additionFactor[unit]);

                // Update specific site's stopAlertUntil field in the database
                await ctx.prisma.site.update({
                    where: {
                        id: siteId
                    },
                    data: {
                        stopAlertUntil: futureDate
                    },
                });
                // Constructing a readable duration message
                const durationUnit = unit === 'minutes' && duration === 1 ? 'minute' :
                                    unit === 'hours' && duration === 1 ? 'hour' :
                                    unit === 'days' && duration === 1 ? 'day' : unit;

                // Respond with a success message including pause duration details
                return {
                    status: 'success',
                    message: `Alert has been successfully paused for the site for ${duration} ${durationUnit}.`
                };
            } catch (error) {
                throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'An error occurred while pausing the alert for the site',
                });
            }
        }),

    deleteSite: protectedProcedure
        .input(params)
        .mutation(async ({ctx, input}) => {
            // Check if user is authenticated and not soft deleted
            const userId = ctx.user!.id;
            await checkUserHasSitePermission({ ctx, siteId: input.siteId, userId: userId });
            const isPlanetROSite = await checkIfPlanetROSite({ ctx, siteId: input.siteId })

            if (isPlanetROSite) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "FireAlert cannot delete Site fetched from Plant-for-the-Planet, Please delete it from Plant-for-the-Planet Platform",
                });
            }
            try {
                // Soft Delete the site & Alerts associated with it. Set deletedAt to current time
                await ctx.prisma.site.update({
                    where: {
                        id: input.siteId,
                    },
                    data: {
                        deletedAt: new Date(),
                    }
                });
                // SiteAlert is automatically cascade deleted during db-cleanup, when the site gets permanently deleted,
                // However, notifications are still created when siteAlert is not marked as soft-deleted
                // Therefore, SiteAlerts need to be soft-deleted, as we want to stop creating notifications for soft-deleted sites
                await ctx.prisma.siteAlert.updateMany({
                    where: {
                        siteId: input.siteId,
                    },
                    data: {
                        deletedAt: new Date(),
                    }
                });

                return {
                    status: "success",
                    message: `Site with id ${input.siteId} deleted successfully`,
                };


            } catch (error) {
                console.log(error);
                if (error instanceof TRPCError) {
                    // if the error is already a TRPCError, just re-throw it
                    throw error;
                }
                // if it's a different type of error, throw a new TRPCError
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Something Went Wrong`,
                });
            }
        }),
});
