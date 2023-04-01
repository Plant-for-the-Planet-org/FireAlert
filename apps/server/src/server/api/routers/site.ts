import { TRPCError } from "@trpc/server";
import { createSiteSchema, params, updateSiteSchema } from '../zodSchemas/site.schema'
import {
    createTRPCRouter,
    protectedProcedure,
} from "../../../server/api/trpc";


export const siteRouter = createTRPCRouter({

    createSite: protectedProcedure
        .input(createSiteSchema)
        .mutation(async ({ ctx, input }) => {
            try {
                const site = await ctx.prisma.site.create({
                    data: {
                        type: input.type,
                        geometry: input.geometry,
                        radius: input.radius,
                        isMonitored: input.isMonitored,
                        userId: ctx.session.user.id,
                    }
                });
                return {
                    status: 'success',
                    data: {
                        site,
                    }
                }
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: 'Probably, site with that siteId already exists!'
                });
            }
        }),

    getAllSites: protectedProcedure
        .query(async({ ctx }) => {
            console.log(`Inside getAllSites`)
            try{
                const sites = await ctx.prisma.site.findMany({
                    where: {
                        userId: ctx.session.user.id,
                    }
                })
                return{
                    status: 'success',
                    data: sites,
                }
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: 'Maybe the userid had an error',
                });
            } 
        }),
    
    getSite: protectedProcedure
        .input(params)
        .query(async({ctx, input}) => {
            try{
                const site = await ctx.prisma.site.findFirst({
                    where: { id: input.siteId}
                })
                return{
                    status: 'success',
                    data: site,
                }
            }catch (error){
                console.log(error)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Cannot find a site with that siteId!'
                });
            }
        }),

    updateSite: protectedProcedure
        .input(updateSiteSchema)
        .mutation(async ({ ctx, input}) => {
            try{
                const paramsInput = input.params
                const body = input.body
                const updatedSite = await ctx.prisma.site.update({
                    where: {id: paramsInput.siteId},
                    data: body,
                })
                return{
                    status: 'success',
                    data: updatedSite,
                }
            }catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Cannot update that alert!'
                })
            }
        }),
    
    deleteSite: protectedProcedure
        .input(params)
        .mutation(async ({ctx, input}) => {
            try{
                const deletedSite = await ctx.prisma.site.delete({
                    where: {id: input.siteId}
                })
                return{
                    status: 'success',
                    data: deletedSite
                }
            }catch (error){
                console.log(error)
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Probably site with that Id is not found, so cannot delete site'
                });
            }
        }),
    
});


