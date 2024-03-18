import Long from 'long';
import { SubaccountClient } from './src';
import { CompositeClient } from './src/clients/composite-client';
import { Network, BECH32_PREFIX, } from './src/clients/constants';
import LocalWallet from './src/clients/modules/local-wallet';

const Address = 'dydx1wz7a2ehjq0n6q7fpqkakp9928kjjhh6wzskhhe';
const Mnemonic = 'peasant page unveil bunker oil wire general marine march shine mother height regret case evidence';
const FromSubaccountId = 1;
const TradingSubIds = [20, 21];
const USDCAssetId = 0;
const USDCDenom = 'ibc/8E27BA2D5493AF5636760E354E46004562C46AB7EC0CC4C1CA14E9E20E2545B5';

const client = await CompositeClient.connect(Network.mainnet());
const wallet = await LocalWallet.fromMnemonic(Mnemonic, BECH32_PREFIX);
const subaccountClients: SubaccountClient[] = [];

function log(...args) {
  console.log(`[${new Date().toLocaleString('sv-SE')}]`, ...args);
}

function getSubaccountClient(id: number) {
  if (!subaccountClients[id]) {
    subaccountClients[id] = new SubaccountClient(wallet, id);
  }
  return subaccountClients[id];
}

async function getSubBalance(toId: number) {
  const balance = await client.indexerClient.account.getSubaccount(Address, toId);
  return balance.subaccount.equity;
}

async function getMainBalance(address: string, denom: string) {
  const balance = await client.validatorClient.get.getAccountBalance(address, denom);
  return (balance ? parseInt(balance.amount, 10) : 0) / 1e6;
}

async function transfer(fromId: number, toId: number, amount: number) {
  log(`Transferring ${amount} USDC from ${fromId} to ${toId}`);
  await client.validatorClient.post.transfer(
    getSubaccountClient(fromId), wallet.address!, toId, USDCAssetId, new Long(amount * 1e6));
}

async function withdraw(fromId: number, amount: number) {
  await client.validatorClient.post.withdraw(getSubaccountClient(fromId), USDCAssetId, new Long(amount * 1e6), Address);
}

async function maintainTradingSub(toId: number) {
  log(`Checking subaccount ${toId}`);
  const balance = await getSubBalance(toId);
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

async function maintainMain() {
  log(`Checking main account`);
  const balance = await getMainBalance(Address, USDCDenom);
  log(`Main account has balance ${balance}`);
  if (balance < 1) {
    log(`Main account has balance ${balance} < 1, withdrawing...`);
    await withdraw(FromSubaccountId, 1);
  }
}

function main() {
  log(`Start checking...`);
  maintainMain().catch(console.error);

  for (const toId of TradingSubIds) {
    maintainTradingSub(toId).catch(console.error);
  }
}

log(`Start monitoring for subaccounts ${TradingSubIds}`);
main();
setInterval(() => {
  main();
}, 30 * 1000);
