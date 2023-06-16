import DataRecord from "./DataRecord";

export enum Confidence {
    High = "high",
    Medium = "medium",
    Low = "low",
}

export enum GeoEventSource {
    FIRMS = 'FIRMS'
}

export interface GeoEventData {
    id?: string,
    longitude: number,
    latitude: number,
    eventDate: Date,
    type: "fire",
    confidence: Confidence.High | Confidence.Medium | Confidence.Low,
    providerKey: GeoEventSource.FIRMS,
    identityGroup: string,
    geoEventProviderId: string,
    slice: string,
    data: DataRecord
}

export enum GeoEventDetectionInstrument {
    MODIS = 'MODIS',
    VIIRS = 'VIIRS',
    LANDSAT = 'LANDSAT',
    GEOSTATIONARY = 'GEOSTATIONARY'
}

export enum GeoEventProviderSourceKey {
    LANDSAT_NRT = 'LANDSAT_NRT',
    MODIS_NRT = 'MODIS_NRT',
    MODIS_SP = 'MODIS_SP',
    VIIRS_NOAA20_NRT = 'VIIRS_NOAA20_NRT',
    VIIRS_SNPP_NRT = 'VIIRS_SNPP_NRT',
    VIIRS_SNPP_SP = 'VIIRS_SNPP_SP'
}

// Use enum like this:
// let instrument: GeoEventDetectionInstrument = GeoEventDetectionInstrument.MODIS;
// let providerKey: GeoEventProviderSourceKey = GeoEventProviderSourceKey.LANDSAT_NRT;
// let eventSource: GeoEventSource = GeoEventSource.FIRMS;