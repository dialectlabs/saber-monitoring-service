import { QuarryEventSubscription } from '../src/saber-wars-api/quarry-event-api';
import { getOwner, quarrySDK } from '../src/saber-wars-api/quarry-sdk-factory';
import { getTokenInfo } from '../src/saber-wars-api/token-info-api';
import { toDecimals } from '../src/saber-wars-api/saber-wars-api';

const numberFormat = new Intl.NumberFormat('en-US');

async function main() {
  const defaultSubscription = new QuarryEventSubscription(
    quarrySDK.programs.Mine,
    async (evt) => {
      const resourceId = await getOwner(evt.data.authority);
      if (
        resourceId.toBase58() !== 'GNisgcTZZ2WS5PFAEkVUbFso3wNe22cjhmZiEjGcqeHD'
      ) {
        return;
      }
      if (evt.name === 'StakeEvent') {
        console.log(JSON.stringify(evt));
        const tokenInfo = await getTokenInfo(evt.data.token);
        console.log(JSON.stringify(tokenInfo));
        console.log(
          `Success! You staked ${numberFormat.format(
            toDecimals(evt.data.amount, tokenInfo.decimals),
          )} ${tokenInfo.symbol} to ${tokenInfo.name}`,
        );
      }
      if (evt.name === 'ClaimEvent') {
        const tokenInfo = await getTokenInfo(evt.data.stakedToken);
        console.log(
          `Success! You claimed ${numberFormat.format(
            toDecimals(evt.data.amount, tokenInfo.decimals),
          )} ${tokenInfo.symbol} from ${tokenInfo.name}`,
        );
      }
      return Promise.resolve();
    },
  );

  await defaultSubscription.start();
}

main();
