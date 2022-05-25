export interface Sbr {
  quarry: Quarry;
  govToken: GovToken;
}

export interface GovToken {
  decimals: number;
}

export interface Quarry {
  gauge: {
    gaugemeister: string;
  };
  rewarder: string;
}

export interface Rewarders {
  quarries: Quarry[];
}

export interface Quarry {
  quarry: string;
  stakedToken: StakedToken;
}

export interface StakedToken {
  decimals: number;
  mint: string;
}

export interface TokenMintInfo {
  name: string;
  symbol: string;
  decimals: number;
}
