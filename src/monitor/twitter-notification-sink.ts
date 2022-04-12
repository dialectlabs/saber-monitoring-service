import { DialectNotification, NotificationSink } from '@dialectlabs/monitor';
import { TwitterApi } from 'twitter-api-v2';
import { Logger } from '@nestjs/common';

export class TwitterNotificationSink
  implements NotificationSink<DialectNotification>
{
  private readonly logger = new Logger(TwitterNotificationSink.name);
  // Instanciate with desired auth type (here's Bearer v2 auth)
  private twitterClient = new TwitterApi({
    appKey: process.env.TWITTER_APP_KEY,
    appSecret: process.env.TWITTER_APP_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
  });

  async push({ message: text }: DialectNotification): Promise<void> {
    this.logger.log(text);
    return this.twitterClient.v2
      .tweet({
        text,
      })
      .then();
  }
}
