// test entry point to trigger the creation of SiteAlert and the corresponding Notifications
// to execute, point yiur browser to: http://localhost:3000/api/tests/match

import geoEventEmitter from '../../../Events/EventEmitter/GeoEventEmitter'
import { GEO_EVENTS_PROCESSED } from '../../../Events/messageConstants'

geoEventEmitter.emit(GEO_EVENTS_PROCESSED)
