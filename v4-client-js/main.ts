import Long from 'long';
import { SubaccountClient } from './src';
import { CompositeClient } from './src/clients/composite-client';
import { Network, BECH32_PREFIX, } from './src/clients/constants';
import LocalWallet from './src/clients/modules/local-wallet';

const Address = 'dydx1wz7a2ehjq0n6q7fpqkakp9928kjjhh6wzskhhe';
const Mnemonic = 'peasant page unveil bunker oil wire general marine march shine mother height regret case evidence';
const FromSubaccountId = 1;
const ToSubaccountIds = [2, 3];

const client = await CompositeClient.connect(Network.mainnet());
const wallet = await LocalWallet.fromMnemonic(Mnemonic, BECH32_PREFIX);
const subaccountClients: SubaccountClient[] = [];

function log(...args) {
  console.log(`[${new Date().toLocaleString('sv-SE')}]`, ...args);
}

function getSubaccountClient(subaccountId) {
  if (!subaccountClients[subaccountId]) {
    subaccountClients[subaccountId] = new SubaccountClient(wallet, subaccountId);
  }
  return subaccountClients[subaccountId];
}

async function getBalance(toId) {
  const balance = await client.indexerClient.account.getSubaccount(Address, toId);
  return balance.subaccount.assetPositions.USDC.size;
}

async function transfer(fromId, toId, amount) {
  // 0 for USDC
  const assetId = 0;
  log(`Transferring ${amount} USDC from ${fromId} to ${toId}`);
  return;
  await client.validatorClient.post.transfer(
    getSubaccountClient(fromId), wallet.address!, toId, assetId, new Long(amount * 1e6));
}

async function run(toId) {
  log(`Checking subaccount ${toId}`);
  const balance = await getBalance(toId);
  log(`Subaccount ${toId} has balance ${balance}`);
  if (balance < 500) {
    log(`Subaccount ${toId} has balance ${balance} < 500, transferring...`);
    await transfer(FromSubaccountId, toId, 1000);
  }
  else if (balance < 1000) {
    log(`Subaccount ${toId} has balance ${balance} < 1000, transferring...`);
    await transfer(FromSubaccountId, toId, 500);
  }
}

function main() {
  log(`Start monitoring for subaccounts ${ToSubaccountIds}`);
  setInterval(() => {
    log(`Start checking...`);
    for (const toId of ToSubaccountIds) {
      run(toId).catch(console.error);
    }
  }, 30 * 1000);
}

main();
