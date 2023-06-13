import EventEmitter from "eventemitter3";
import { CREATE_SITE_ALERTS } from '../messageConstants'
const siteAlertEmitter = new EventEmitter();
import createSiteAlerts from '../../Services/SiteAlert/CreateSiteAlert';

siteAlertEmitter    
    .on(CREATE_SITE_ALERTS, (geoEventProviderId: string, slice: string) => {
        createSiteAlerts(geoEventProviderId, slice)
    });

export default siteAlertEmitter;