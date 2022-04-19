import { ClaimEvent, StakeEvent } from '@quarryprotocol/quarry-sdk';
import { getTokenInfo } from '../src/saber-wars-api/token-info-api';
import { QuarryEventSubscription } from '../src/saber-wars-api/quarry-event-api';
import { quarrySDK } from '../src/saber-wars-api/quarry-sdk-factory';

async function main() {
  const defaultSubscription = new QuarryEventSubscription(
    quarrySDK.programs.Mine,
    async (it) => {
      switch (it.name) {
        case 'StakeEvent': {
          const stakeEvent = it as StakeEvent;
          const optionalParams = await getTokenInfo(
            stakeEvent.data.token.toBase58(),
          );
          console.log(stakeEvent, optionalParams);
          break;
        }
        case 'ClaimEvent': {
          const claimEvent = it as ClaimEvent;
          const optionalParams = await getTokenInfo(
            claimEvent.data.rewardsToken.toBase58(),
          );
          console.log(claimEvent, optionalParams);
          break;
        }
      }
      return Promise.resolve();
    },
  );

  await defaultSubscription.start();
}

main();
