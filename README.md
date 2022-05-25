# Saber monitoring service

A reference implementation of `@dialectlabs/monitor` used to power notifications in a twitter bot https://twitter.com/saberwarsbot.
The twitter bot sends the following tweets

## Votes cast 
Votes cast tweet is sent at 11AM ET and 7PM ET and includes the following data
- Progress for % of votes cast vs. previous epoch.
- The time left in the epoch.
- Top vote getter

```
Epoch 7 progress: 77% of votes committed
449,646,909 votes committed (581,650,867 cast in epoch 6)
Vote leader: Saber UST-USDC LP | 194,329,794 votes and 432,183 SBR/day
Time remaining in epoch: 01:00:11:58 

⚔️⚔️⚔️⚔️⚔️#SABERWARS⚔️⚔️⚔️⚔️⚔️
```

## Whale alert

Whale alert is sent anytime a gauge changes by more than 4,000,000 votes and includes the following data
- Number of votes committed to gauge.
- Updated reward.

```
⚔️🐳🚨 Whale alert! 🚨🐳⚔️

4,489,856 votes committed to Saber cUSDC-cUSDT LP | 49,184 SBR/day

⚔️⚔️⚔️⚔️⚔️#SABERWARS⚔️⚔️⚔️⚔️⚔️
```

See https://github.com/dialectlabs/monitor for details on the notifications module.

## Development

### Prerequisites

- Git
- Yarn (<2)
- Nodejs (>=16.10.0 <17)

### Getting started with monitor development in this repo

#### Install dependencies

**npm:**

```shell
npm install
```

**yarn:**

```shell
yarn
```

### Running locally

#### generate a new keypair for friktion monitoring service and fund it

```bash
export keypairs_dir=~/projects/dialect
solana-keygen new --outfile ${keypairs_dir}/saber-service-dev-local-key.json
solana-keygen pubkey ${keypairs_dir}/saber-service-dev-local-key.json > ${keypairs_dir}/saber-service-dev-local-key.pub
solana -k ${keypairs_dir}/saber-service-dev-local-key.json airdrop 300

#### start server (test mode)

```shell
export keypairs_dir=~/projects/dialect
TEST_MODE=true \
WHALE_MONITOR_THRESHOLD=5000 \
RPC_URL= \
QUARRY_RPC_URL= \
NETWORK_NAME=localnet \
PRIVATE_KEY=$(cat ${keypairs_dir}/saber-service-dev-local-key.json) yarn start:dev

```

#### start clients

```shell
export keypairs_dir=~/projects/dialect
MONITORING_SERVICE_PUBLIC_KEY=$(cat ${keypairs_dir}/saber-service-dev-local-key.pub) ts-node test/saber-clients.ts
```

### Containerization

#### Build image (macOS)

```shell
brew install jq
./docker-build.sh
```

#### Publish image

```shell
brew install jq
docker login
./docker-publish.sh
```