export enum AlertType {
    fire = 'fire'
}

export enum SiteAlertDetectedBy {
    LANDSAT_NRT = 'LANDSAT_NRT',
    MODIS_NRT = 'MODIS_NRT',
    MODIS_SP = 'MODIS_SP',
    VIIRS_NOAA20_NRT = 'VIIRS_NOAA20_NRT',
    VIIRS_SNPP_NRT = 'VIIRS_SNPP_NRT',
    VIIRS_SNPP_SP = 'VIIRS_SNPP_SP'
}

// Use enum like this:
// let alert: AlertType = AlertType.fire;