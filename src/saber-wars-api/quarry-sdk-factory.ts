import { GaugeSDK } from '@quarryprotocol/gauge';
import { Connection, Keypair } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';
import NodeWallet from '@project-serum/anchor/dist/cjs/nodewallet';
import { makeSaberProvider } from '@saberhq/anchor-contrib';
import { Provider } from '@project-serum/anchor';

export const buildGaugeSdk = (): GaugeSDK => {
  const connection = new Connection(
    'https://solana-api.syndica.io/access-token/6sW38nSZ1Qm4WVRN4Vnbjb9EF2QudlpGZBToMtPyqoXqkIenDwJ5FVK1HdWSqqah/rpc',
    'recent',
  );

  const keypair = new Keypair();
  const wallet = new NodeWallet(keypair);
  const provider1 = new Provider(
    connection,
    wallet,
    anchor.Provider.defaultOptions(),
  );
  const provider = makeSaberProvider(provider1);
  return GaugeSDK.load({
    provider,
  });
};
