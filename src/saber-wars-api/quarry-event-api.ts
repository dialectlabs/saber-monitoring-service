import { EventParser } from '@project-serum/anchor';
import { sleep } from '@dialectlabs/web3';
import {
  ClaimEvent,
  MineProgram,
  StakeEvent,
} from '@quarryprotocol/quarry-sdk';

export type EventHandler = (event: ClaimEvent | StakeEvent) => any;

export class QuarryEventSubscription {
  private readonly eventParser: EventParser;
  private isInterrupted = false;
  private subscriptionId?: number;

  constructor(
    private readonly program: MineProgram,
    private readonly eventHandler: EventHandler,
  ) {
    this.eventParser = new EventParser(program.programId, program.coder);
  }

  async start(): Promise<QuarryEventSubscription> {
    this.periodicallyReconnect();
    return this;
  }

  async reconnectSubscriptions() {
    await this.unsubscribeFromLogsIfSubscribed();
    this.subscriptionId = this.program.provider.connection.onLogs(
      this.program.programId,
      async (logs) => {
        if (logs.err) {
          console.error(logs);
          return;
        }
        this.eventParser.parseLogs(logs.logs, (event) => {
          if (!this.isInterrupted) {
            switch (event.name) {
              case 'StakeEvent': {
                this.eventHandler(event as StakeEvent);
                break;
              }
              case 'ClaimEvent': {
                this.eventHandler(event as ClaimEvent);
                break;
              }
            }
          }
        });
      },
    );
  }

  private async periodicallyReconnect() {
    while (!this.isInterrupted) {
      await this.reconnectSubscriptions();
      await sleep(1000 * 60);
    }
  }

  private unsubscribeFromLogsIfSubscribed() {
    return this.subscriptionId
      ? this.program.provider.connection.removeOnLogsListener(
          this.subscriptionId,
        )
      : Promise.resolve();
  }
}
