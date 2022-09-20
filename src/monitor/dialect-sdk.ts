import {
  Dapps,
  DialectSdk as IDialectSdk,
  DialectSdkInfo,
  Messaging,
  Wallets,
  IdentityResolver
} from '@dialectlabs/sdk';

export abstract class DialectSdk implements IDialectSdk {
  readonly dapps: Dapps;
  readonly info: DialectSdkInfo;
  readonly threads: Messaging;
  readonly wallet: Wallets;
  readonly identity: IdentityResolver;
}
