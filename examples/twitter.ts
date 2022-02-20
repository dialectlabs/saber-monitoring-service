import { TwitterNotificationSink } from '../src/monitor/twitter-notification-sink';

const twitterNotificationSink = new TwitterNotificationSink();
twitterNotificationSink.push({
  message: 'test',
});
