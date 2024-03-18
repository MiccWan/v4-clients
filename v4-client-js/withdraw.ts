import Long from 'long';
import { SubaccountClient } from './src';
import { CompositeClient } from './src/clients/composite-client';
import { Network, BECH32_PREFIX, } from './src/clients/constants';
import LocalWallet from './src/clients/modules/local-wallet';

const Address = 'dydx1wz7a2ehjq0n6q7fpqkakp9928kjjhh6wzskhhe';
const Mnemonic = 'peasant page unveil bunker oil wire general marine march shine mother height regret case evidence';
const FromSubaccountId = 1;
const USDCAssetId = 0;

const client = await CompositeClient.connect(Network.mainnet());
const wallet = await LocalWallet.fromMnemonic(Mnemonic, BECH32_PREFIX);
const subaccountClients: SubaccountClient[] = [];


function getSubaccountClient(id: number) {
  if (!subaccountClients[id]) {
    subaccountClients[id] = new SubaccountClient(wallet, id);
  }
  return subaccountClients[id];
}

async function withdraw(fromId: number, amount: number) {
  await client.validatorClient.post.withdraw(getSubaccountClient(fromId), USDCAssetId, new Long(amount * 1e6), Address);
}

async function run() {
  withdraw(FromSubaccountId, 1);
}

run().catch(console.error);
