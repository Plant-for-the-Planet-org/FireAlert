import {GEO_EVENT} from "../messageConstants"
import geoEventEmitter from "../EventEmitter/GeoEventEmitter";
import handleGeoEvents from "../../Services/GeoEventHandler";

geoEventEmitter.on(GEO_EVENT.NOTIFICATION, handleGeoEvents)