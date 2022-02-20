import { getPoolInfo } from 'src/saber-wars-api/saber-wars-api';

async function run() {
  const pools = await getPoolInfo();
  pools.forEach(
    ({
      name,
      currentEpochRelativeShare,
      currentEpochAbsoluteShare,
      currentEpochRewardsPerDay,
      nextEpochRelativeShare,
      nextEpochAbsoluteShare,
      nextEpochRewardsPerDay,
    }) =>
      console.log(
        name,
        `current share: ${currentEpochRelativeShare.toFixed(
          2,
        )}% (${currentEpochAbsoluteShare.toFixed(
          3,
        )}): ${currentEpochRewardsPerDay.toFixed(0)} SBR/day`,
        `next share: ${nextEpochRelativeShare.toFixed(
          2,
        )}% (${nextEpochAbsoluteShare.toFixed(
          3,
        )}): ${nextEpochRewardsPerDay.toFixed(0)} SBR/day`,
      ),
  );
}

run();
