import EventEmitter from "eventemitter3";
import { SITE_ALERTS_CREATED } from '../messageConstants'
const siteAlertEmitter = new EventEmitter();
import createSiteAlerts from '../../Services/SiteAlert/CreateSiteAlert';

siteAlertEmitter    
    .on(SITE_ALERTS_CREATED, (identityGroup: string) => {
        createSiteAlerts(identityGroup)
    });

export default siteAlertEmitter;