import {
  Notification,
  NotificationSink,
  ResourceId,
} from '@dialectlabs/monitor';

export class ConsoleNotificationSink<N extends Notification>
  implements NotificationSink<N>
{
  push(notification: N, recipients: ResourceId[]): Promise<void> {
    console.log(
      `Got new notification ${JSON.stringify(
        notification,
      )} for recipients ${recipients}`,
    );
    return Promise.resolve();
  }
}
