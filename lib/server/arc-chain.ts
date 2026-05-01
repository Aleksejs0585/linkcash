import { JsonRpcProvider } from "ethers";
import { ARC_TESTNET } from "../../utils";

export async function createArcProvider(rpcUrl: string): Promise<JsonRpcProvider> {
  const provider = new JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();

  if (Number(network.chainId) !== ARC_TESTNET.chainId) {
    throw new Error(`RPC_URL must point to Arc Testnet (${ARC_TESTNET.chainId}).`);
  }

  return provider;
}

export async function assertContractDeployed(
  provider: JsonRpcProvider,
  contractAddress: string
): Promise<void> {
  const contractCode = await provider.getCode(contractAddress);
  if (!contractCode || contractCode === "0x") {
    throw new Error(
      "CONTRACT_ADDRESS is not a deployed contract on the configured network."
    );
  }
}

export async function createArcProviderWithContractCheck(
  rpcUrl: string,
  contractAddress: string
): Promise<JsonRpcProvider> {
  const provider = await createArcProvider(rpcUrl);
  await assertContractDeployed(provider, contractAddress);
  return provider;
}

