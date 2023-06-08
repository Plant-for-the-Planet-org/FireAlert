import EventEmitter from "eventemitter3";
import { NOTIFICATION_CREATED, NOTIFICATION_SENT } from '../messageConstants'
const notificationEmitter = new EventEmitter();
import createNotifications from '../../Services/Notifications/CreateNotifications';
import sendNotifications from '../../Services/Notifications/SendNotifications'

notificationEmitter
    .on(NOTIFICATION_CREATED, createNotifications)
    .on(NOTIFICATION_SENT, sendNotifications)

export default notificationEmitter;