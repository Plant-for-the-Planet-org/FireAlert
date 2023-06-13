// test entry point to trigger the creation of Notifications
// to execute, point yiur browser to: http://localhost:3000/api/tests/notification

import notificationEmitter from '../../../Events/EventEmitter/NotificationEmitter'
import { NOTIFICATION_CREATED } from '../../../Events/messageConstants'

notificationEmitter.emit(NOTIFICATION_CREATED)
