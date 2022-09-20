import { GaugeSDK } from '@quarryprotocol/gauge';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Provider } from '@project-serum/anchor';
import NodeWallet from '@project-serum/anchor/dist/cjs/nodewallet';
import { makeSaberProvider } from '@saberhq/anchor-contrib';
import { QuarrySDK } from '@quarryprotocol/quarry-sdk';

const connection = new Connection(
  process.env.DIALECT_SDK_SOLANA_RPC_URL!,
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

const mmPkToOwnerPk: Map<string, PublicKey> = new Map<string, PublicKey>();

export async function getOwner(authority: PublicKey): Promise<PublicKey> {
  const cacheKey = authority.toBase58();
  if (!mmPkToOwnerPk.has(cacheKey)) {
    try {
      const mm = await quarrySDK.mergeMine.fetchMergeMinerData(
        new PublicKey(authority),
      );
      mmPkToOwnerPk.set(cacheKey, mm.data.owner);
    } catch (e) {
      mmPkToOwnerPk.set(cacheKey, authority);
      // console.error(e);
    }
  }
  const ownerPkBase58 = mmPkToOwnerPk.get(cacheKey)!;
  return ownerPkBase58 && new PublicKey(ownerPkBase58);
}
