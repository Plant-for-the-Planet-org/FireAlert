import { TRPCError } from "@trpc/server";
import { fetchAlertSchema} from '../zodSchemas/fetchAlert.schema'
import {
    createTRPCRouter,
    publicProcedure,
} from "../trpc";


export const fetchAlertRouter = createTRPCRouter({

    fetchAlert: publicProcedure
        .input(fetchAlertSchema)
        .query(async ({ input }) => {
            const coordinatesString = input.areaCoordinates.join(',')
            try {
                const data = await fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${input.mapKey}/${input.source}/${coordinatesString}/${input.dayRange}/${input.date?input.date:''}`)
                const json = await data.json()
                return {
                    status: 'success',
                    data: {
                        json,
                    }
                }
            } catch (error) {
                console.log(error)
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: 'Failed to fetch data!'
                });
            }
        }), 
});


