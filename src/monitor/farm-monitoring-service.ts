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
  Web2SubscriberRepository,
} from '@dialectlabs/monitor';
import {
  InMemoryWeb2SubscriberRepository,
  RestWeb2SubscriberRepository,
} from '@dialectlabs/monitor/lib/cjs/internal/rest-web2-subscriber.repository';
import { findAllDistinct } from '@dialectlabs/monitor/lib/cjs/internal/subsbscriber-repository-utilts';
import { toDecimals } from '../saber-wars-api/saber-wars-api';
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
  private readonly inMemoryWeb2SubscriberRepository: Web2SubscriberRepository;
  private readonly subscriberRepository: InMemorySubscriberRepository;

  constructor(private readonly dialectConnection: DialectConnection) {
    this.subscriberRepository = InMemorySubscriberRepository.decorate(
      new OnChainSubscriberRepository(
        dialectConnection.getProgram(),
        dialectConnection.getKeypair(),
      ),
    );
    this.inMemoryWeb2SubscriberRepository =
      new InMemoryWeb2SubscriberRepository(
        dialectConnection.getKeypair().publicKey,
        new RestWeb2SubscriberRepository(
          process.env.WEB2_SUBSCRIBER_SERVICE_BASE_URL!,
          dialectConnection.getKeypair().publicKey,
        ),
      );
  }

  onModuleInit() {
    this.initFarmMonitor();
  }

  async onModuleDestroy() {
    await Monitors.shutdown();
  }

  private async initFarmMonitor() {
    const subscribers = await findAllDistinct(
      this.subscriberRepository,
      this.inMemoryWeb2SubscriberRepository,
    );

    const quarryEvents = new Subject<SourceData<DialectNotification>>();
    new QuarryEventSubscription(quarrySDK.programs.Mine, async (evt) => {
      if (subscribers.length === 0) {
        this.logger.warn('No subscribers, skipping event');
        return;
      }
      const resourceId = process.env.TEST_MODE
        ? subscribers[0]
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
      monitorKeypair: this.dialectConnection.getKeypair(),
      dialectProgram: this.dialectConnection.getProgram(),
      sinks: {
        sms: {
          twilioUsername: process.env.TWILIO_ACCOUNT_SID!,
          twilioPassword: process.env.TWILIO_AUTH_TOKEN!,
          senderSmsNumber: process.env.TWILIO_SMS_SENDER!,
        },
        email: {
          apiToken: process.env.SENDGRID_KEY!,
          senderEmail: process.env.SENDGRID_EMAIL!,
        },
        telegram: {
          telegramBotToken: process.env.TELEGRAM_TOKEN!,
        },
      },
      web2SubscriberRepositoryUrl: process.env.WEB2_SUBSCRIBER_SERVICE_BASE_URL,
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
        {
          dispatch: 'unicast',
          to: ({ groupingKey }) => new PublicKey(groupingKey),
        },
      )
      .telegram(
        ({ value }) => {
          return {
            body: `⚔️ SABER: ` + value.message,
          };
        },
        {
          dispatch: 'unicast',
          to: ({ groupingKey }) => new PublicKey(groupingKey),
        },
      )
      .sms(
        ({ value }) => {
          return {
            body: `⚔️ SABER: ` + value.message,
          };
        },
        {
          dispatch: 'unicast',
          to: ({ groupingKey }) => new PublicKey(groupingKey),
        },
      )
      .email(
        ({ value }) => {
          return {
            subject: `⚔️ SABER: Successful ${
              value.message.includes('claimed') ? 'Claim' : 'Stake'
            }`,
            text: value.message,
          };
        },
        {
          dispatch: 'unicast',
          to: ({ groupingKey }) => new PublicKey(groupingKey),
        },
      )
      .and()
      .build();
    farmMonitor.start();
  }
}
