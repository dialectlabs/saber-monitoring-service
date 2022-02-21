import { Notification, NotificationSink } from '@dialectlabs/monitor';
import { TwitterApi } from 'twitter-api-v2';

export class TwitterNotificationSink implements NotificationSink {
  // Instanciate with desired auth type (here's Bearer v2 auth)
  private twitterClient = new TwitterApi({
    appKey: process.env.TWITTER_APP_KEY,
    appSecret: process.env.TWITTER_APP_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
  });

  async push({ message: text }: Notification): Promise<void> {
    return this.twitterClient.v2
      .tweet({
        text,
      })
      .then();
  }
}
