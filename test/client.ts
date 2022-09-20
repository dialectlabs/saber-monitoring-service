import { createClient } from '@dialectlabs/monitor';
import { Backend, Environment } from '@dialectlabs/sdk';
import { PublicKey } from '@solana/web3.js';

const main = async (): Promise<void> => {
  const dappPublicKeyFromEnv = process.env.DAPP_PUBLIC_KEY;
  if (!dappPublicKeyFromEnv) {
    return;
  }
  await startClients(dappPublicKeyFromEnv);
};

async function startClients(dappPublicKeyFromEnv: string) {
  const dappPublicKey = new PublicKey(dappPublicKeyFromEnv);
  if (dappPublicKeyFromEnv) {
    await Promise.all([
      createClient(
        {
          environment: process.env.DIALECT_SDK_ENVIRONMENT as Environment,
          backends: [Backend.DialectCloud, Backend.Solana],
        },
        dappPublicKey,
      ),
    ]);
  }
}

main();
