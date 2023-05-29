import { TRPCContext } from './Context'

export type CheckUserHasSitePermissionArgs = {
    ctx: TRPCContext; // the TRPC context object
    siteId: string; // the ID of the site to be updated
    userId: string; // the ID of the user attempting to update the site
};
export type CheckIfPlanetROSiteArgs = {
    ctx: TRPCContext; // the TRPC context object
    siteId: string; // the ID of the site to be updated
}
export type SiteOriginData = "firealert" | "ttc"
export type SiteTypeData = "Point" | "Polygon" | "Multipolygon"
interface PointGeometry {
    type: "Point";
    coordinates: [number, number];
}

interface PolygonGeometry {
    type: "Polygon";
    coordinates: Array<Array<[number, number] | [number, number, number?]>>;
}

interface MultiPolygonGeometry {
    type: "MultiPolygon";
    coordinates: Array<Array<[number, number] | [number, number, number?]>>;
}

export type GeometryData = PointGeometry | PolygonGeometry | MultiPolygonGeometry;

export type SiteData = {
    id?: string
    remoteId?: string | null
    name?: string | null
    origin: SiteOriginData
    type: SiteTypeData
    geometry: GeometryData
    radius: number
    isMonitored: boolean
    lastUpdated?: Date
    userId: string
}