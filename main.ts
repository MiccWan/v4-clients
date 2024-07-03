import 'dotenv/config';
import fs from 'fs';
import Long from 'long';
import { SubaccountClient } from './src';
import { CompositeClient } from './src/clients/composite-client';
import { Network, BECH32_PREFIX, } from './src/clients/constants';
import LocalWallet from './src/clients/modules/local-wallet';

const ConfigPath = process.env.CONFIG_PATH!;
const config = JSON.parse(fs.readFileSync(ConfigPath, 'utf-8'));
const Address = config.address;
const Mnemonic = config.mnemonic;
const rules = config.rules;
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

async function transferSub(fromId: number, toId: number, amount: number) {
  await client.validatorClient.post.transfer(
    getSubaccountClient(fromId), wallet.address!, toId, USDCAssetId, new Long(amount * 1e6));
}

async function withdraw(fromId: number, amount: number) {
  await client.validatorClient.post.withdraw(getSubaccountClient(fromId), USDCAssetId, new Long(amount * 1e6), Address);
}

async function transfer(fromId: number, toId: number, amount: number) {
  log(`Transferring ${amount} USDC from ${fromId} to ${toId}`);
  if (fromId === -1) {
    throw new Error('Transfer from main is not supported');
  }

  const fromBalance = await getBalance(fromId);
  console.log(`From balance: ${fromBalance}`);

  if (fromBalance < amount) {
    throw new Error(`Insufficient balance in ${fromId}`);
  }

  if (toId === -1) {
    await withdraw(fromId, amount);
  }
  else {
    await transferSub(fromId, toId, amount);
  }
}

async function getBalance(id: number) {
  if (id === -1) {
    return await getMainBalance(Address, USDCDenom);
  }
  else {
    return await getSubBalance(id);
  }
}

function init() {
  for (const rule of rules) {
    if (rule.from === -1) {
      throw new Error('Transfer from main is not supported');
    }
  }
}

async function _main() {
  log(`Start checking...`);
  for (const rule of rules) {
    const { from, to, when, step, until } = rule;
    
    log(`Fetching balance for ${to}`);
    const balance = await getBalance(to);
    log(`Balance for ${to}: ${balance}`);
    if (balance < when) {
      log(`Balance for ${to} is less than ${when}`);
      const times = Math.ceil((until - balance) / step);
      const amount = times * step;
      await transfer(from, to, amount);
    }
  }
}

function main() {
  _main().catch(console.error);
}

init();
log(`Start monitoring for subaccounts ${rules.map(r => r.to)}`);
main();
setInterval(() => {
  main();
}, 30 * 1000);
