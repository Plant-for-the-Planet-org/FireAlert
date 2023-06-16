import { GeoEventData as GeoEvent } from "./GeoEvent";

export interface GeoEventProviderConfig {
    sourceKey: string,
    bbox: string,
    slice: string,
    apiUrl: string,
}

export interface GeoEventProvider {
    getKey: () => string;
    getIdentityGroup: () => string;
    initialize: (config?: GeoEventProviderConfigGeneral) => void;
    getLatestGeoEvents: (providerKey:string, geoEventProviderId:string, slice:string) => Promise<GeoEvent[]>;
}

export interface GeoEventProviderConfigGeneral {
    [key: string]: any;
}