import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  Context,
  DialectNotification,
  Monitor,
  Monitors,
  Pipelines,
  SourceData,
  Trace,
} from '@dialectlabs/monitor';
import { Duration } from 'luxon';
import { getWarsInfo, PoolInfo } from '../saber-wars-api/saber-wars-api';
import { NoopSubscriberRepository } from './noop-subscriber-repository';
import { Cron } from '@nestjs/schedule';
import { DialectConnection } from './dialect-connection';
import { Subject } from 'rxjs';
import { QuarryEventSubscription } from '../saber-wars-api/quarry-event-api';
import { quarrySDK } from '../saber-wars-api/quarry-sdk-factory';
import { ConsoleNotificationSink } from './console-notification-sink';

@Injectable()
export class SaberMonitoringService implements OnModuleInit, OnModuleDestroy {
  private readonly notificationSink: ConsoleNotificationSink<DialectNotification> =
    new ConsoleNotificationSink<DialectNotification>();

  private readonly logger = new Logger(SaberMonitoringService.name);
  private readonly numberFormat = new Intl.NumberFormat('en-US');

  onModuleInit() {
    this.initWhaleAlertMonitor();
    this.initFarmMonitor();
  }

  constructor(private readonly dialectConnection: DialectConnection) {}

  private initFarmMonitor() {
    const subject = new Subject<SourceData<DialectNotification>>();
    new QuarryEventSubscription(quarrySDK.programs.Mine, (evt) => {
      if (evt.name === 'StakeEvent') {
        subject.next({
          data: {
            message: JSON.stringify(evt),
          },
          resourceId: evt.data.authority,
        });
      }
      if (evt.name === 'ClaimEvent') {
        subject.next({
          data: {
            message: JSON.stringify(evt),
          },
          resourceId: evt.data.authority,
        });
      }
    }).start();

    const monitor: Monitor<DialectNotification> = Monitors.builder({
      monitorKeypair: this.dialectConnection.getKeypair(),
      dialectProgram: this.dialectConnection.getProgram(),
    })
      .defineDataSource<DialectNotification>()
      .push(subject)
      .notify()
      .custom(({ value }) => value, new ConsoleNotificationSink())
      .and()
      .dispatch('unicast')
      .build();
    monitor.start();
  }

  private initWhaleAlertMonitor() {
    const threshold = parseInt(process.env.WHALE_MONITOR_THRESHOLD);

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
            resourceId: data.address,
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
      .custom(({ context }) => {
        this.logger.log('Building whale alert');
        return {
          message: this.createWhaleAlert(context),
        };
      }, new ConsoleNotificationSink())
      .and()
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
    await this.notificationSink.push({ message }, []);
  }

  async onModuleDestroy() {
    await Monitors.shutdown();
  }
}
