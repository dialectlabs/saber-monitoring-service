import axios from 'axios';
import { Rewarders, Sbr, TokenMintInfo } from './saber-wars-api-dto';
import { buildGaugeSdk } from './quarry-sdk-factory';
import { PublicKey } from '@solana/web3.js';
import {
  findEpochGaugeAddress,
  findGaugeAddress,
  GaugemeisterData,
} from '@quarryprotocol/gauge';
import BN from 'bn.js';
import { QUARRY_CODERS } from '@quarryprotocol/quarry-sdk';
import { Duration } from 'luxon';

const tribecaRegistrySbrUrl =
  'https://raw.githubusercontent.com/TribecaHQ/tribeca-registry-build/master/registry/mainnet/sbr.json';

const rewardersUrl = (rewarderAddress: string) =>
  `https://raw.githubusercontent.com/QuarryProtocol/rewarder-list-build/master/mainnet-beta/rewarders/${rewarderAddress}/meta.json`;

const tokenMintInfoUrl = (tokenMintAddress: string) =>
  `https://cdn.jsdelivr.net/gh/CLBExchange/certified-token-list/101/${tokenMintAddress}.json`;

function toDecimals(bn: BN, decimals: number): number {
  return bn.toNumber() / Math.pow(10, decimals);
}

export interface RawPoolInfo {
  name: string;
  address: PublicKey;
  currentEpochAbsoluteShare: BN;
  nextEpochAbsoluteShare: BN;
}

export interface SaberWarsInfo {
  poolsInfo: PoolInfo[];
  epochInfo: EpochInfo;
}

export interface PoolInfo {
  name: string;
  address: PublicKey;
  currentEpochAbsoluteShare: number;
  currentEpochRelativeShare: number;
  currentEpochRewardsPerDay: number;
  nextEpochAbsoluteShare: number;
  nextEpochRelativeShare: number;
  nextEpochRewardsPerDay: number;
}

export interface EpochInfo {
  currentEpoch: number;
  currentEpochRemainingTime: Duration;
}

const gaugeSdk = buildGaugeSdk();

function getEpochInfo(gaugemeister: GaugemeisterData) {
  const currentEpoch = gaugemeister.currentRewardsEpoch;
  const currentEpochRemainingTime = Duration.fromObject({
    seconds:
      gaugemeister.nextEpochStartsAt.toNumber() - new Date().getTime() / 1000,
  });

  const epochInfo: EpochInfo = {
    currentEpoch,
    currentEpochRemainingTime,
  };
  return epochInfo;
}

async function getPoolsInfo(
  gaugemeisterAddress: PublicKey,
  gaugemeister: GaugemeisterData,
  sbr: Sbr,
) {
  const rewarders: Rewarders = (
    await axios.get<Rewarders>(rewardersUrl(sbr.quarry.rewarder))
  ).data;

  const poolInfos: RawPoolInfo[] = await Promise.all(
    rewarders.quarries.map(async (quarry) => {
      const quarryAddress = new PublicKey(quarry.quarry);

      const tokenMintAddress = quarry.stakedToken.mint;
      const tokenMintInfo = (
        await axios.get<TokenMintInfo>(tokenMintInfoUrl(tokenMintAddress))
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
        address: new PublicKey(tokenMintAddress),
        currentEpochAbsoluteShare: gaugeData
          ? gaugeData.rewardsShare
          : new BN(0),
        nextEpochAbsoluteShare: epochGauge?.totalPower
          ? epochGauge.totalPower
          : new BN(0),
      };

      return poolInfo;
    }),
  );

  const sumCurrentShare = poolInfos
    .map((it) => it.currentEpochAbsoluteShare)
    .reduce((acc, next) => acc.add(next), new BN(0));

  const sumNextShare = poolInfos
    .map((it) => it.nextEpochAbsoluteShare)
    .reduce((acc, next) => acc.add(next), new BN(0));

  const calculated: PoolInfo[] = poolInfos.map((it) => {
    const currRelative =
      (it.currentEpochAbsoluteShare.toNumber() / sumCurrentShare.toNumber()) *
      100;
    const nextRelative =
      (it.nextEpochAbsoluteShare.toNumber() / sumNextShare.toNumber()) * 100;

    return {
      ...it,
      currentEpochAbsoluteShare: toDecimals(
        it.currentEpochAbsoluteShare,
        sbr.govToken.decimals,
      ),
      currentEpochRelativeShare: currRelative,
      currentEpochRewardsPerDay: currRelative * 10_000,
      nextEpochAbsoluteShare: toDecimals(
        it.nextEpochAbsoluteShare,
        sbr.govToken.decimals,
      ),
      nextEpochRelativeShare: nextRelative,
      nextEpochRewardsPerDay: nextRelative * 10_000,
    };
  });
  return calculated.sort(
    ({ nextEpochAbsoluteShare: a }, { nextEpochAbsoluteShare: b }) => b - a,
  );
}

export async function getWarsInfo(): Promise<SaberWarsInfo> {
  const sbr: Sbr = (await axios.get<Sbr>(tribecaRegistrySbrUrl)).data;

  const gaugemeisterAddress = new PublicKey(sbr.quarry.gauge.gaugemeister);
  const gaugemeister = await gaugeSdk.gauge.fetchGaugemeister(
    gaugemeisterAddress,
  );
  const epochInfo = getEpochInfo(gaugemeister);
  const poolsInfo = await getPoolsInfo(gaugemeisterAddress, gaugemeister, sbr);

  return Promise.resolve({
    epochInfo,
    poolsInfo,
  });
}
