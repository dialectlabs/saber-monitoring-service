# Saber monitoring service

A reference implementation of a service running `@dialectlabs/monitor` for saber wars.
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

```shell
MAINNET_RPC_URL=rpcUrl \
TWITTER_APP_KEY=appKey \
TWITTER_APP_SECRET=appSecret \
TWITTER_ACCESS_TOKEN=accessToken \
TWITTER_ACCESS_SECRET=accessSecret \
WHALE_MONITOR_THRESHOLD=5000 \
  yarn start:dev
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