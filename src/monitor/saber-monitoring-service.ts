import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  Context,
  Monitor,
  Monitors,
  NotificationSink,
  Pipelines,
  SourceData,
  Trace,
} from '@dialectlabs/monitor';
import { Duration } from 'luxon';
import { getWarsInfo, PoolInfo } from '../saber-wars-api/saber-wars-api';
import { NoopSubscriberRepository } from './noop-subscriber-repository';
import { Cron } from '@nestjs/schedule';
import { TwitterNotificationSink } from './twitter-notification-sink';

@Injectable()
export class SaberMonitoringService implements OnModuleInit, OnModuleDestroy {
  private readonly notificationSink: NotificationSink =
    new TwitterNotificationSink();

  private readonly logger = new Logger(SaberMonitoringService.name);
  private readonly numberFormat = new Intl.NumberFormat('en-US');

  onModuleInit() {
    const threshold = parseInt(process.env.WHALE_MONITOR_THRESHOLD);

    const monitor: Monitor<PoolInfo> = Monitors.builder({
      subscriberRepository: new NoopSubscriberRepository(),
      notificationSink: this.notificationSink,
    })
      .defineDataSource<PoolInfo>()
      .poll(async () => {
        const warsInfo = await getWarsInfo();
        const sourceData: SourceData<PoolInfo>[] = warsInfo.poolsInfo.map(
          (data) => ({
            data,
            resourceId: data.address,
          }),
        );
        return Promise.resolve(sourceData);
      }, Duration.fromObject({ minutes: 1 }))
      .transform<number>({
        keys: ['nextEpochAbsoluteShare'],
        pipelines: [
          Pipelines.threshold(
            {
              type: 'increase',
              threshold,
            },
            {
              messageBuilder: ({ context }) => this.createWhaleAlert(context),
            },
          ),
        ],
      })
      .dispatch('unicast')
      .build();
    monitor.start();
  }

  private createWhaleAlert({
    trace,
    origin: { name: poolName, nextEpochRewardsPerDay: rewardsPerDay },
  }: Context<PoolInfo>) {
    const triggerOutput = SaberMonitoringService.getTriggerOutput(trace);
    return `⚔️🐳🚨 Whale alert! 🚨🐳⚔️

${this.numberFormat.format(
  Math.round(triggerOutput),
)} votes committed to ${poolName} | ${this.numberFormat.format(
      Math.round(rewardsPerDay),
    )} SBR/day

⚔️⚔️⚔️⚔️⚔️#SABERWARS⚔️⚔️⚔️⚔️⚔️`;
  }

  private static getTriggerOutput(trace: Trace[]) {
    return trace.find((it) => it.type === 'trigger')?.output;
  }

  @Cron('0 0 11,19 * * *', {
    // @Cron('0,30 * * * * *', {
    name: 'notifications',
    timeZone: 'America/New_York',
  })
  async handleCron() {
    const { poolsInfo, epochInfo } = await getWarsInfo();

    const totalCurrentEpochShare = poolsInfo
      .map((it) => it.currentEpochAbsoluteShare)
      .reduce((acc, next) => acc + next, 0);
    const totalNextEpochShare = poolsInfo
      .map((it) => it.nextEpochAbsoluteShare)
      .reduce((acc, next) => acc + next, 0);
    const voteLeader = poolsInfo[0];
    const message = `Epoch ${epochInfo.currentEpoch} progress: ${(
      (totalNextEpochShare / totalCurrentEpochShare) *
      100
    ).toFixed(0)}% of votes committed
${this.numberFormat.format(
  Math.round(totalNextEpochShare),
)} votes committed (${this.numberFormat.format(
      Math.round(totalCurrentEpochShare),
    )} cast in epoch ${epochInfo.currentEpoch - 1})
Vote leader: ${voteLeader.name} | ${this.numberFormat.format(
      Math.round(voteLeader.nextEpochAbsoluteShare),
    )} votes and ${this.numberFormat.format(
      Math.round(voteLeader.nextEpochRewardsPerDay),
    )} SBR/day
Time remaining in epoch: ${epochInfo.currentEpochRemainingTime.toFormat(
      'dd:hh:mm:ss',
    )} 

⚔️⚔️⚔️⚔️⚔️#SABERWARS⚔️⚔️⚔️⚔️⚔️`;
    await this.notificationSink.push({ message }, []);
  }

  async onModuleDestroy() {
    await Monitors.shutdown();
  }
}
