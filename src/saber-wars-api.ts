import axios from 'axios';
import { Rewarders, Sbr } from './saber-wars-api-dto';
import { buildGaugeSdk } from './quarry-sdk-factory';
import { PublicKey } from '@solana/web3.js';

const tribecaRegistrySbrUrl =
  'https://raw.githubusercontent.com/TribecaHQ/tribeca-registry-build/master/registry/mainnet/sbr.json';

const rewardersUrl = (rewarderAddress: string) =>
  `https://raw.githubusercontent.com/QuarryProtocol/rewarder-list-build/9fc2af0f20480c1510c2e065f2820fcf0c5046bd/mainnet-beta/rewarders/${rewarderAddress}/meta.json`;

const tokenMintInfoUrl = (tokenMintAddress: string) =>
  `https://cdn.jsdelivr.net/gh/CLBExchange/certified-token-list/101/${tokenMintAddress}.json`;

async function run() {
  const sbr: Sbr = (await axios.get<Sbr>(tribecaRegistrySbrUrl)).data;
  // console.log(sbr.quarry.gauge.gaugemeister);
  // console.log(sbr.quarry.rewarder);
  const rewarders: Rewarders = (
    await axios.get<Rewarders>(rewardersUrl(sbr.quarry.rewarder))
  ).data;

  const gaugeSdk = buildGaugeSdk();

  const gaugemeister = await gaugeSdk.gauge.fetchGaugemeister(
    new PublicKey(sbr.quarry.gauge.gaugemeister),
  );
  console.log(JSON.stringify(gaugemeister));
}

run();
