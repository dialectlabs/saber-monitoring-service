import { QuarryEventSubscription } from '../src/saber-wars-api/quarry-event-api';
import { getOwner, quarrySDK } from '../src/saber-wars-api/quarry-sdk-factory';
import { getTokenInfo } from '../src/saber-wars-api/token-info-api';
import { ClaimEvent, StakeEvent } from '@quarryprotocol/quarry-sdk';

async function main() {
  const defaultSubscription = new QuarryEventSubscription(
    quarrySDK.programs.Mine,
    async (it) => {
      const owner = await getOwner(it.data.authority);
      switch (it.name) {
        case 'StakeEvent': {
          const stakeEvent = it as StakeEvent;
          const optionalParams = await getTokenInfo(
            stakeEvent.data.token.toBase58(),
          );
          console.log(
            `Stake event from ${owner.toBase58()}, ${stakeEvent.data.amount.toNumber()}`,
          );
          break;
        }
        case 'ClaimEvent': {
          const claimEvent = it as ClaimEvent;
          const optionalParams = await getTokenInfo(
            claimEvent.data.rewardsToken.toBase58(),
          );
          console.log(
            `Claim event from ${owner.toBase58()}, ${claimEvent.data.amount.toNumber()}`,
          );
          break;
        }
      }
      return Promise.resolve();
    },
  );

  await defaultSubscription.start();
}

main();
