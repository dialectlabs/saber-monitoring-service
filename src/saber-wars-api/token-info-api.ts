import axios from 'axios';
import { TokenMintInfo } from './saber-wars-api-dto';
import { PublicKey } from '@solana/web3.js';

const tokenMintInfoUrl = (tokenMintAddress: string) =>
  `https://cdn.jsdelivr.net/gh/CLBExchange/certified-token-list/101/${tokenMintAddress}.json`;

const cache: Map<string, TokenMintInfo> = new Map<string, TokenMintInfo>();

export async function getTokenInfo(address: string | PublicKey) {
  const tokenMintAddress = address.toString();
  if (!cache.has(tokenMintAddress)) {
    const tokenMintInfo = await axios
      .get<TokenMintInfo>(tokenMintInfoUrl(tokenMintAddress))
      .then((it) => it.data);
    cache.set(tokenMintAddress, tokenMintInfo);
  }
  return cache.get(tokenMintAddress);
}
