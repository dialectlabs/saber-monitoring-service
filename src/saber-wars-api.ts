import axios from 'axios';
import { Rewarders, Sbr, TokenMintInfo } from './saber-wars-api-dto';
import { buildGaugeSdk } from './quarry-sdk-factory';
import { PublicKey } from '@solana/web3.js';
import { findEpochGaugeAddress, findGaugeAddress } from '@quarryprotocol/gauge';
import BN from 'bn.js';
import { QUARRY_CODERS } from '@quarryprotocol/quarry-sdk';

const tribecaRegistrySbrUrl =
  'https://raw.githubusercontent.com/TribecaHQ/tribeca-registry-build/master/registry/mainnet/sbr.json';

const rewardersUrl = (rewarderAddress: string) =>
  `https://raw.githubusercontent.com/QuarryProtocol/rewarder-list-build/9fc2af0f20480c1510c2e065f2820fcf0c5046bd/mainnet-beta/rewarders/${rewarderAddress}/meta.json`;

const tokenMintInfoUrl = (tokenMintAddress: string) =>
  `https://cdn.jsdelivr.net/gh/CLBExchange/certified-token-list/101/${tokenMintAddress}.json`;

function toDecimals(bn: BN, decimals: number): number {
  return bn.toNumber() / Math.pow(10, decimals);
}

export interface RawPoolInfo {
  name: string;
  currentShare: RawShare;
  nextShare: RawShare;
}

export interface RawShare {
  absolute: BN;
}

export interface PoolInfo {
  name: string;
  currentShare: Share;
  nextShare: Share;
}

export interface Share {
  absolute: number;
  relative: number;
  rewardsPerDay: number;
}

async function run() {
  const sbr: Sbr = (await axios.get<Sbr>(tribecaRegistrySbrUrl)).data;
  // console.log(sbr.quarry.gauge.gaugemeister);
  // console.log(sbr.quarry.rewarder);
  const rewarders: Rewarders = (
    await axios.get<Rewarders>(rewardersUrl(sbr.quarry.rewarder))
  ).data;

  const gaugeSdk = buildGaugeSdk();

  const gaugemeisterAddress = new PublicKey(sbr.quarry.gauge.gaugemeister);
  const gaugemeister = await gaugeSdk.gauge.fetchGaugemeister(
    gaugemeisterAddress,
  );
  console.log(JSON.stringify(gaugemeister));

  const poolInfos: RawPoolInfo[] = await Promise.all(
    rewarders.quarries.map(async (quarry) => {
      const quarryAddress = new PublicKey(quarry.quarry);

      const tokenMintInfo = (
        await axios.get<TokenMintInfo>(
          tokenMintInfoUrl(quarry.stakedToken.mint),
        )
      ).data;

      const [gaugeAddress] = await findGaugeAddress(
        gaugemeisterAddress,
        quarryAddress,
      );
      const gauge =
        gaugeAddress && (await gaugeSdk.gauge.fetchGauge(gaugeAddress));
      const gaugeData =
        gauge &&
        (await QUARRY_CODERS.Mine.getProgram(
          gaugeSdk.provider,
        ).account.quarry.fetch(gauge.quarry));

      const currentRewardsEpoch = gaugemeister.currentRewardsEpoch;
      const votingEpoch = currentRewardsEpoch + 1;
      const [epochGaugeAddress] = await findEpochGaugeAddress(
        gaugeAddress,
        votingEpoch,
      );

      const epochGauge = await gaugeSdk.gauge.fetchEpochGauge(
        epochGaugeAddress,
      );

      const poolInfo: RawPoolInfo = {
        name: tokenMintInfo.name,
        currentShare: {
          absolute: gaugeData ? gaugeData.rewardsShare : new BN(0),
        },
        nextShare: {
          absolute: epochGauge?.totalPower ? epochGauge.totalPower : new BN(0),
        },
      };

      return poolInfo;
    }),
  );

  const sumCurrentShare = poolInfos
    .map((it) => it.currentShare.absolute)
    .reduce((acc, next) => acc.add(next), new BN(0));

  const sumNextShare = poolInfos
    .map((it) => it.nextShare.absolute)
    .reduce((acc, next) => acc.add(next), new BN(0));

  // console.log(sumCurrentShare.toNumber(), sumNextShare.toNumber());

  const calculated: PoolInfo[] = poolInfos.map((it) => {
    const currRelative =
      (it.currentShare.absolute.toNumber() / sumCurrentShare.toNumber()) * 100;
    const nextRelative =
      (it.nextShare.absolute.toNumber() / sumNextShare.toNumber()) * 100;

    return {
      ...it,
      currentShare: {
        absolute: toDecimals(it.currentShare.absolute, sbr.govToken.decimals),
        relative: currRelative,
        rewardsPerDay: currRelative * 10_000 * 0.9, // I'm sorry about this, didn't find a way to get rewards/year for arbitrary epoch
      },
      nextShare: {
        absolute: toDecimals(it.nextShare.absolute, sbr.govToken.decimals),
        relative: nextRelative,
        rewardsPerDay: nextRelative * 10_000 * 0.9, // I'm sorry about this, didn't find a way to get rewards/year for arbitrary epoch
      },
    };
  });

  const sorted = calculated.sort(
    ({ nextShare: { absolute: a } }, { nextShare: { absolute: b } }) => b - a,
  );

  sorted.forEach(({ name, currentShare, nextShare }) =>
    console.log(
      name,
      `current share: ${currentShare.relative.toFixed(
        2,
      )}% (${currentShare.absolute.toFixed(
        3,
      )}): ${currentShare.rewardsPerDay.toFixed(0)} SBR/day`,
      `next share: ${nextShare.relative.toFixed(
        2,
      )}% (${nextShare.absolute.toFixed(3)}): ${nextShare.rewardsPerDay.toFixed(
        0,
      )} SBR/day`,
    ),
  );
}

run();
