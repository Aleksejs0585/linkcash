import { readFileSync } from "node:fs";
import solc from "solc";
import { ethers } from "ethers";

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const USDC_CONTRACT_ADDRESS =
  process.env.USDC_CONTRACT_ADDRESS ||
  "0x3600000000000000000000000000000000000000";

if (!RPC_URL || !PRIVATE_KEY) {
  throw new Error("Missing RPC_URL or PRIVATE_KEY in environment.");
}

const source = readFileSync("contracts/VibeLinkGift.sol", "utf8");
const input = {
  language: "Solidity",
  sources: {
    "VibeLinkGift.sol": { content: source },
  },
  settings: {
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode"],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const contractOutput = output.contracts?.["VibeLinkGift.sol"]?.VibeLinkGift;

if (!contractOutput?.evm?.bytecode?.object) {
  const errors = (output.errors ?? [])
    .map((e) => `${e.severity}: ${e.formattedMessage}`)
    .join("\n");
  throw new Error(`Failed to compile VibeLinkGift.sol\n${errors}`);
}

const abi = contractOutput.abi;
const bytecode = `0x${contractOutput.evm.bytecode.object}`;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const network = await provider.getNetwork();
console.log(`Deploying on chainId=${network.chainId.toString()}`);
console.log(`Deployer: ${signer.address}`);

const factory = new ethers.ContractFactory(abi, bytecode, signer);
const contract = await factory.deploy(USDC_CONTRACT_ADDRESS);
console.log(`Deploy tx: ${contract.deploymentTransaction()?.hash ?? "n/a"}`);
await contract.waitForDeployment();
const contractAddress = await contract.getAddress();
console.log(`Contract deployed at: ${contractAddress}`);
