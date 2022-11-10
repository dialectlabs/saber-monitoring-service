import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  DialectSdkNotification,
  DialectSdkNotificationSink,
  DialectSdkSubscriberRepository,
  Monitors,
  SourceData,
  SubscriberRepository,
} from '@dialectlabs/monitor';
import { DialectSdk } from './dialect-sdk';
import { InMemorySubscriberRepository } from '@dialectlabs/monitor/lib/cjs/internal/in-memory-subscriber.repository';
import { toDecimals } from '../saber-wars-api/saber-wars-api';
import { Subject } from 'rxjs';
import { QuarryEventSubscription } from '../saber-wars-api/quarry-event-api';
import { getOwner, quarrySDK } from '../saber-wars-api/quarry-sdk-factory';
import { getTokenInfo } from '../saber-wars-api/token-info-api';
import { PublicKey } from '@solana/web3.js';
import { Duration } from 'luxon';

@Injectable()
export class FarmMonitoringService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FarmMonitoringService.name);
  private readonly numberFormat = new Intl.NumberFormat('en-US');
  private readonly subscriberRepository: SubscriberRepository;
  private readonly dialectSdkNotificationSink: DialectSdkNotificationSink;

  constructor(private readonly sdk: DialectSdk) {
    this.subscriberRepository = InMemorySubscriberRepository.decorate(
      new DialectSdkSubscriberRepository(sdk),
      Duration.fromObject({ minute: 5 }),
    );
    this.dialectSdkNotificationSink = new DialectSdkNotificationSink(
      sdk,
      this.subscriberRepository,
    );
  }

  onModuleInit() {
    this.initFarmMonitor();
  }

  async onModuleDestroy() {
    await Monitors.shutdown();
  }

  private async initFarmMonitor() {
    const quarryEvents = new Subject<SourceData<DialectSdkNotification>>();
    new QuarryEventSubscription(quarrySDK.programs.Mine, async (evt) => {
      const subscribers = await this.subscriberRepository.findAll();
      if (subscribers.length === 0) {
        this.logger.warn('No subscribers, skipping event');
        return;
      }
      const resourceId = process.env.TEST_MODE
        ? subscribers[0].resourceId
        : await getOwner(evt.data.authority);

      if (!subscribers.find((it) => it.resourceId.equals(resourceId))) {
        return;
      }
      if (evt.name === 'StakeEvent') {
        const tokenInfo = await getTokenInfo(evt.data.token);
        quarryEvents.next({
          data: {
            title: 'Stake',
            message: `Success! You staked ${this.numberFormat.format(
              toDecimals(evt.data.amount, tokenInfo.decimals),
            )} ${tokenInfo.symbol} to ${tokenInfo.name}`,
          },
          groupingKey: resourceId.toBase58(),
        });
      }

      if (evt.name === 'ClaimEvent') {
        const stakedTokenInfo = await getTokenInfo(evt.data.stakedToken);
        const rewardsTokenInfo = await getTokenInfo(evt.data.rewardsToken);
        /*
          Construct message, e.g.:
          Success! You claimed 0.5 SBR from USDH-USDC LP.
        */
        quarryEvents.next({
          data: {
            title: 'Claim',
            message: `Success! You claimed ${this.numberFormat.format(
              toDecimals(evt.data.amount, rewardsTokenInfo.decimals),
            )} ${rewardsTokenInfo.symbol} from ${stakedTokenInfo.name}`,
          },
          groupingKey: resourceId.toBase58(),
        });
      }
    }).start();

    const farmMonitor = Monitors.builder({
      sdk: this.sdk,
      subscribersCacheTTL: Duration.fromObject({ minute: 5 }),
    })
      .defineDataSource<DialectSdkNotification>()
      .push(quarryEvents)
      .notify()
      .dialectSdk(
        (ctx) => {
          return {
            title: ctx.value.title,
            message: ctx.value.message,
          };
        },
        {
          dispatch: 'unicast',
          to: (ctx) => new PublicKey(ctx.groupingKey),
        },
      )
      .and()
      .build();
    farmMonitor.start();
  }
}
