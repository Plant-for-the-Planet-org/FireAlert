import { TRPCError } from "@trpc/server";
import {
    createTRPCRouter,
    publicProcedure,
} from "../trpc";
import { env } from "../../../env.mjs";
import { parse } from "csv-parse";
const source = ['MODIS_NRT', 'MODIS_SP', 'VIIRS_NOAA20_NRT', 'VIIRS_SNPP_NRT', 'VIIRS_SNPP_SP']

export const fetchAlertRouter = createTRPCRouter({


    fetchAlert: publicProcedure
        .query(async ({ ctx }) => {
            const today: Date = new Date();
            const year: number = today.getFullYear();
            const month: number = today.getMonth() + 1;
            const day: number = today.getDate();

            const formattedDate: string = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const data = await fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${env.MAP_KEY}/${source[0]}/-180,-90,180,90/1/${formattedDate}`)
            const csv = await data.text();
            const records = await parse(csv, { columns: true });
            const sites = await ctx.prisma.site.findMany()

            for await (const record of records) {
                for (const site of sites) {
                    const coordinates = site.geometry.coordinates;
                    const polygon = turf.polygon(coordinates);
                    const point = turf.point([record.longitude, record.latitude]);

                    if (turf.booleanPointInPolygon(point, polygon)) {
                        await ctx.prisma.alert.create({
                            data: {
                                site: {
                                    connect: {
                                        id: site.id
                                    }
                                },
                                fireCount: record['frp'],
                                confidence: record['confidence'],
                                date: record['acq_date'],
                                latitude: record['latitude'],
                                longitude: record['longitude']
                            }
                        });
                    } else {
                        continue;
                    }
                }
            }
        }),
});


