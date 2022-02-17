export interface Sbr {
  quarry: Quarry;
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
