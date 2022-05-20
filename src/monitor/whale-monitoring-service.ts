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
  Pipelines,
  SourceData,
  Trace,
} from '@dialectlabs/monitor';
import { Duration } from 'luxon';
import {
  getWarsInfo,
  PoolInfo,
} from '../saber-wars-api/saber-wars-api';
import { NoopSubscriberRepository } from './noop-subscriber-repository';
import { Cron } from '@nestjs/schedule';
import { DialectConnection } from './dialect-connection';
import { TwitterNotificationSink } from './twitter-notification-sink';
import { PublicKey } from '@solana/web3.js';

@Injectable()
export class WhaleMonitoringService implements OnModuleInit, OnModuleDestroy {
  private readonly twitterNotificationSink: TwitterNotificationSink =
    new TwitterNotificationSink();
  private readonly logger = new Logger(WhaleMonitoringService.name);
  private readonly numberFormat = new Intl.NumberFormat('en-US');
  constructor(private readonly dialectConnection: DialectConnection) {}

  private static getTriggerOutput(trace: Trace[]) {
    return trace.find((it) => it.type === 'trigger')?.output;
  }

  onModuleInit() {
    this.initWhaleAlertMonitor();
  }

  @Cron('0 0 11,19 * * *', {
    // @Cron('0,30 * * * * *', {
    name: 'notifications',
    timeZone: 'America/New_York',
  })
  async handleCron() {
    this.logger.log('Cron execution started');
    const { poolsInfo, epochInfo } = await getWarsInfo();

    const totalCurrentEpochShare = poolsInfo
      .map((it) => it.currentEpochAbsoluteShare)
      .reduce((acc, next) => acc + next, 0);
    const totalNextEpochShare = poolsInfo
      .map((it) => it.nextEpochAbsoluteShare)
      .reduce((acc, next) => acc + next, 0);
    const voteLeader = poolsInfo[0];
    const message = `Epoch ${epochInfo.currentEpoch + 1} progress: ${(
      (totalNextEpochShare / totalCurrentEpochShare) *
      100
    ).toFixed(0)}% of votes committed
${this.numberFormat.format(
  Math.round(totalNextEpochShare),
)} votes committed (${this.numberFormat.format(
      Math.round(totalCurrentEpochShare),
    )} cast in epoch ${epochInfo.currentEpoch})
Vote leader: ${voteLeader.name} | ${this.numberFormat.format(
      Math.round(voteLeader.nextEpochAbsoluteShare),
    )} votes and ${this.numberFormat.format(
      Math.round(voteLeader.nextEpochRewardsPerDay),
    )} SBR/day
Time remaining in epoch: ${epochInfo.currentEpochRemainingTime.toFormat(
      'dd:hh:mm:ss',
    )} 

⚔️⚔️⚔️⚔️⚔️#SABERWARS⚔️⚔️⚔️⚔️⚔️`;
    await this.twitterNotificationSink.push({ message });
  }

  async onModuleDestroy() {
    await Monitors.shutdown();
  }

  private initWhaleAlertMonitor() {
    const threshold = parseInt(process.env.WHALE_MONITOR_THRESHOLD!);

    const monitor: Monitor<PoolInfo> = Monitors.builder({
      subscriberRepository: new NoopSubscriberRepository(),
    })
      .defineDataSource<PoolInfo>()
      .poll(async () => {
        this.logger.log('Polling saber wars data');
        const warsInfo = await getWarsInfo();
        const sourceData: SourceData<PoolInfo>[] = warsInfo.poolsInfo.map(
          (data) => ({
            data,
            groupingKey: data.address.toBase58(),
          }),
        );
        return Promise.resolve(sourceData);
      }, Duration.fromObject({ minutes: 1 }))
      .transform<number, number>({
        keys: ['nextEpochAbsoluteShare'],
        pipelines: [
          Pipelines.threshold({
            type: 'increase',
            threshold,
          }),
        ],
      })
      .notify()
      .custom(
        (val) => {
          const message = this.createWhaleAlert(val.context);
          this.logger.log(message);
          return {
            message,
          };
        },
        this.twitterNotificationSink,
        {
          dispatch: 'unicast',
          to: (val) => new PublicKey(val.groupingKey),
        }
      )
      .and()
      .build();
    monitor.start();
  }

  private createWhaleAlert({
    trace,
    origin: { name: poolName, nextEpochRewardsPerDay: rewardsPerDay },
  }: Context<PoolInfo>) {
    const triggerOutput = WhaleMonitoringService.getTriggerOutput(trace)!;
    return `⚔️🐳🚨 Whale alert! 🚨🐳⚔️

${this.numberFormat.format(
  Math.round(triggerOutput),
)} votes committed to ${poolName} | ${this.numberFormat.format(
      Math.round(rewardsPerDay),
    )} SBR/day

⚔️⚔️⚔️⚔️⚔️#SABERWARS⚔️⚔️⚔️⚔️⚔️`;
  }
}
