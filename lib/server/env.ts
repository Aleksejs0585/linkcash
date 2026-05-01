import { isAddress } from "ethers";
import { ARC_TESTNET } from "../../utils";

type ArcReadEnv = {
  rpcUrl: string;
  contractAddress: string;
  usdcAddress: string;
};

type ArcRelayerEnv = ArcReadEnv & {
  privateKey: string;
};

class EnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvValidationError";
  }
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new EnvValidationError(`Missing required env var: ${name}.`);
  }
  return value;
}

function readAddressEnv(name: string, fallback?: string): string {
  const raw = process.env[name]?.trim() || fallback;
  if (!raw) {
    throw new EnvValidationError(`Missing required env var: ${name}.`);
  }
  if (!isAddress(raw)) {
    throw new EnvValidationError(`${name} must be a valid EVM address.`);
  }
  return raw;
}

export function getArcReadEnv(): ArcReadEnv {
  const rpcUrl = readRequiredEnv("RPC_URL");
  const contractAddress = readAddressEnv("CONTRACT_ADDRESS");
  const usdcAddress = readAddressEnv(
    "USDC_CONTRACT_ADDRESS",
    ARC_TESTNET.usdcErc20Address
  );

  return { rpcUrl, contractAddress, usdcAddress };
}

export function getArcRelayerEnv(): ArcRelayerEnv {
  const { rpcUrl, contractAddress, usdcAddress } = getArcReadEnv();
  const privateKey = readRequiredEnv("PRIVATE_KEY");
  return { rpcUrl, contractAddress, usdcAddress, privateKey };
}

export function getClaimRateLimitPerMinute(defaultValue = 12): number {
  const raw = process.env.CLAIM_RATE_LIMIT_PER_MINUTE?.trim();
  if (!raw) return defaultValue;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return defaultValue;
  }

  return Math.floor(parsed);
}

