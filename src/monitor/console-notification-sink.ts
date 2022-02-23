import { Notification, NotificationSink } from '@dialectlabs/monitor';

export class ConsoleNotificationSink implements NotificationSink {
  push(notification: Notification): Promise<void> {
    console.log(notification.message);
    return Promise.resolve();
  }
}
