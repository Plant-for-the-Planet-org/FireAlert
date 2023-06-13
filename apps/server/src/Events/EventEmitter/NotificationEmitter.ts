import EventEmitter from "eventemitter3";
import { CREATE_NOTIFICATIONS, SEND_NOTIFICATIONS } from '../messageConstants'
const notificationEmitter = new EventEmitter();
import createNotifications from '../../Services/Notifications/CreateNotifications';
import sendNotifications from '../../Services/Notifications/SendNotifications'

notificationEmitter
    .on(CREATE_NOTIFICATIONS, createNotifications)
    .on(SEND_NOTIFICATIONS, sendNotifications)

export default notificationEmitter;