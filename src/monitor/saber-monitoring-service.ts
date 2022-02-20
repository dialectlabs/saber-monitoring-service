import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  Context,
  Monitor,
  Monitors,
  Pipelines,
  SourceData,
  Trace,
} from '@dialectlabs/monitor';
import { Keypair } from '@solana/web3.js';
import { Duration } from 'luxon';
import { PoolInfo } from '../saber-wars-api/saber-wars-api';
import { NoopSubscriberRepository } from './noop-subscriber-repository';
import { ConsoleNotificationSink } from './console-notification-sink';

@Injectable()
export class SaberMonitoringService implements OnModuleInit, OnModuleDestroy {
  private resourceId = Keypair.generate().publicKey;

  onModuleInit() {
    let counter = 0;

    const threshold = 5;

    const monitor: Monitor<PoolInfo> = Monitors.builder({
      subscriberRepository: new NoopSubscriberRepository(),
      notificationSink: new ConsoleNotificationSink(),
    })
      .defineDataSource<PoolInfo>()
      .poll(() => {
        const sourceData: SourceData<PoolInfo>[] = [
          {
            resourceId: this.resourceId,
            data: {
              name: 'Saber UST-CASH LP',
              address: this.resourceId,
              currentEpochAbsoluteShare: 1,
              currentEpochRelativeShare: 0.1,
              currentEpochRewardsPerDay: 1,
              nextEpochAbsoluteShare: counter * counter,
              nextEpochRelativeShare: 0.2,
              nextEpochRewardsPerDay: 2,
            },
          },
        ];
        counter++;
        return Promise.resolve(sourceData);
      }, Duration.fromObject({ seconds: 1 }))
      .transform<number>({
        keys: ['nextEpochAbsoluteShare'],
        pipelines: [
          Pipelines.threshold(
            {
              type: 'increase',
              threshold,
            },
            {
              messageBuilder: ({ context }) =>
                SaberMonitoringService.createWhaleAlert(context),
            },
            {
              type: 'throttle-time',
              timeSpan: Duration.fromObject({ minutes: 10 }),
            },
          ),
        ],
      })
      .dispatch('unicast')
      .build();
    monitor.start();
  }

  private static createWhaleAlert({
    trace,
    origin: { name: poolName, nextEpochRewardsPerDay: rewardsPerDay },
  }: Context<PoolInfo>) {
    const nf = new Intl.NumberFormat('en-US');

    const triggerOutput = SaberMonitoringService.getTriggerOutput(trace);
    return `⚔️🐳🚨Whale alert! 🚨🐳⚔️

${nf.format(triggerOutput)} votes committed to ${poolName}
[${nf.format(rewardsPerDay)}] SBR rwds/day
⚔️⚔️⚔️⚔️⚔️#SABERWARS⚔️⚔️⚔️⚔️⚔️`;
  }

  private static getTriggerOutput(trace: Trace[]) {
    return trace.find((it) => it.type === 'trigger')?.output;
  }

  async onModuleDestroy() {
    await Monitors.shutdown();
  }
}
