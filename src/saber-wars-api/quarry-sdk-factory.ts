import { GaugeSDK } from '@quarryprotocol/gauge';
import { Connection, Keypair } from '@solana/web3.js';
import { Provider } from '@project-serum/anchor';
import NodeWallet from '@project-serum/anchor/dist/cjs/nodewallet';
import { makeSaberProvider } from '@saberhq/anchor-contrib';
import { QuarrySDK } from '@quarryprotocol/quarry-sdk';

const connection = new Connection(
  process.env.QUARRY_RPC_URL ?? process.env.RPC_URL!,
  {
    commitment: 'recent',
  },
);

const keypair = new Keypair();
const wallet = new NodeWallet(keypair);
const provider1 = new Provider(connection, wallet, Provider.defaultOptions());
const provider = makeSaberProvider(provider1);
export const gaugeSdk = GaugeSDK.load({
  provider,
});

export const quarrySDK = QuarrySDK.load({
  provider,
});
