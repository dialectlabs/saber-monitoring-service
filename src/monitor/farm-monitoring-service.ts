import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  DialectNotification,
  Monitors,
  SourceData,
} from '@dialectlabs/monitor';
import {
  toDecimals,
} from '../saber-wars-api/saber-wars-api';
import { DialectConnection } from './dialect-connection';
import { Subject } from 'rxjs';
import { QuarryEventSubscription } from '../saber-wars-api/quarry-event-api';
import { getOwner, quarrySDK } from '../saber-wars-api/quarry-sdk-factory';
import { getTokenInfo } from '../saber-wars-api/token-info-api';
import { OnChainSubscriberRepository } from '@dialectlabs/monitor/lib/cjs/internal/on-chain-subscriber.repository';
import { InMemorySubscriberRepository } from '@dialectlabs/monitor/lib/cjs/internal/in-memory-subscriber.repository';
import { PublicKey } from '@solana/web3.js';

@Injectable()
export class FarmMonitoringService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FarmMonitoringService.name);
  private readonly numberFormat = new Intl.NumberFormat('en-US');
  constructor(private readonly dialectConnection: DialectConnection) {}

  onModuleInit() {
    this.initFarmMonitor();
  }

  async onModuleDestroy() {
    await Monitors.shutdown();
  }

  private initFarmMonitor() {
    const onChainSubscriberRepository = new OnChainSubscriberRepository(
      this.dialectConnection.getProgram(),
      this.dialectConnection.getKeypair(),
    );
    const subscriberRepository = InMemorySubscriberRepository.decorate(
      onChainSubscriberRepository,
    );

    const quarryEvents = new Subject<SourceData<DialectNotification>>();
    new QuarryEventSubscription(quarrySDK.programs.Mine, async (evt) => {
      if ((await subscriberRepository.findAll()).length === 0) {
        this.logger.warn('No subscribers, skipping event');
        return;
      }
      const resourceId = process.env.TEST_MODE
        ? (await subscriberRepository.findAll())[0]
        : await getOwner(evt.data.authority);
      if (evt.name === 'StakeEvent') {
        const tokenInfo = await getTokenInfo(evt.data.token);
        quarryEvents.next({
          data: {
            message: `Success! You staked ${this.numberFormat.format(
              toDecimals(evt.data.amount, tokenInfo.decimals),
            )} ${tokenInfo.symbol} to ${tokenInfo.name}`,
          },
          groupingKey: resourceId.toBase58(),
        });
      }
      if (evt.name === 'ClaimEvent') {
        const tokenInfo = await getTokenInfo(evt.data.stakedToken);
        quarryEvents.next({
          data: {
            message: `Success! You claimed ${this.numberFormat.format(
              toDecimals(evt.data.amount, tokenInfo.decimals),
            )} ${tokenInfo.symbol} from ${tokenInfo.name}`,
          },
          groupingKey: resourceId.toBase58(),
        });
      }
    }).start();

    const farmMonitor = Monitors.builder({
      subscriberRepository,
      monitorKeypair: this.dialectConnection.getKeypair(),
      dialectProgram: this.dialectConnection.getProgram(),
    })
      .defineDataSource<DialectNotification>()
      .push(quarryEvents)
      .notify()
      .dialectThread(
        ({ value }) => {
          this.logger.log(`Sending message ${value.message}`);
          return {
            message: value.message,
          };
        },
        { dispatch: 'unicast', to: ({ groupingKey }) => new PublicKey(groupingKey) },
      )
      .telegram(
        ({ value }) => {
          return {
            body: `⚔️ SABER: ` + value.message,
          };
        },
        { dispatch: 'unicast', to: ({ groupingKey }) => new PublicKey(groupingKey) },
      )
      .sms(
        ({ value }) => {
          return {
            body: `⚔️ SABER: ` + value.message,
          };
        },
        { dispatch: 'unicast', to: ({ groupingKey }) => new PublicKey(groupingKey) },
      )
      .email(
        ({ value }) => {
          return {
            subject: `⚔️ SABER: Succesful ${value.message.includes("claimed") ? "Claim" : "Stake"}`,
            text: value.message,
          };
        },
        { dispatch: 'unicast', to: ({ groupingKey }) => new PublicKey(groupingKey) },
      )
      .and()
      .build();
    farmMonitor.start();
  }
}
