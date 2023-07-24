const helpers = require("./utils/helpers");
require('dotenv').config();

const selectedCrypto = "bitcoinTestnet";
const baseUrl =
  selectedCrypto === "bitcoinTestnet"
    ? "https://blockstream.info/testnet"
    : "https://blockstream.info";
const path = `m/84'/${selectedCrypto === "bitcoinTestnet" ? "1" : "0"}'/0'/0/0`;

const mnemonic = process.env.MNEMONIC;
const run = async (message) => {
  const keyPair = helpers.getKeyPair({
    mnemonic,
    selectedCrypto,
  });
  console.log("private key length: ", keyPair.privateKey.length)

  const address = helpers.getAddress(keyPair, selectedCrypto, "bech32");

  // const seed = bip39.mnemonicToSeedSync(mnemonic, bip39Passphrase);
  const scriptHash = helpers.getScriptHash(address, selectedCrypto);

  console.log(`${baseUrl}/address/${address}`, "scriptHash", scriptHash);

  let res = await helpers.getBalanceFromUtxos({
    addresses: [{ address, path, scriptHash }],
    changeAddresses: [],
    selectedCrypto,
  });

  //   const relayFee = await helpers.wallet.relayFee.default({ selectedCrypto });
  //   console.log("relayeFee", relayFee);
  console.dir(res, { depth: null });

  if (!res.data.balance) {
    console.log("Balance is 0");
    return;
  }

  if (!res.data.utxos.length) {
    setTimeout(run, 3000, message);
    return;
  }

  // create a transaction with a random message. This tx wont send any coins
  const { data: txHex } = await helpers.createTransaction({
    confirmedBalance: res.data.balance,
    changeAddress: address,
    mnemonic,
    utxos: res.data.utxos,
    selectedCrypto,
    message,
  });

  const { data: txHash } = await helpers.wallet.pushtx.default({
    rawTx: txHex,
    selectedCrypto,
  });

  if (typeof txHash === "string") {
    console.log(`${baseUrl}/tx/${txHash}?expand`);
  }
};

run(Buffer.from(process.argv[2] || "68656C6C6F", "hex")); // hello in hex
