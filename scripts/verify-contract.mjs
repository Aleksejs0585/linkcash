import { readFileSync } from "node:fs";

const CONTRACT_ADDRESS = "0x93fEF97173Af2Da909Fe83961421199B9dB17111";
const EXPLORER_URL = "https://testnet.arcscan.app";
const SOURCE = readFileSync("contracts/VibeLinkGift.sol", "utf8");
const CONSTRUCTOR_ARGS =
  "0000000000000000000000003600000000000000000000000000000000000000";

const url = `${EXPLORER_URL}/api/v2/smart-contracts/${CONTRACT_ADDRESS}/verification/via/flattened-code`;

async function tryVerify(label, evmVersion) {
  console.log(`\nTrying evm_version="${evmVersion}"...`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      compiler_version: "v0.8.28+commit.7893614a",
      source_code: SOURCE,
      is_optimization_enabled: false,
      contract_name: "VibeLinkGift",
      evm_version: evmVersion,
      constructor_args: CONSTRUCTOR_ARGS,
      license_type: "mit",
    }),
  });
  const text = await res.text();
  console.log(`  ${res.status} → ${text}`);

  // Wait a moment and check if verified
  await new Promise((r) => setTimeout(r, 3000));
  const check = await fetch(`${EXPLORER_URL}/api/v2/smart-contracts/${CONTRACT_ADDRESS}`);
  const state = await check.json();
  const verified = state.is_verified ?? state.verified;
  console.log(`  is_verified: ${verified}, name: ${state.name ?? "?"}`);
  return verified === true;
}

for (const evm of ["cancun", "shanghai", "paris", "london", "berlin", "istanbul"]) {
  const ok = await tryVerify(evm, evm);
  if (ok) {
    console.log(`\n✓ Verified with evm_version="${evm}"!`);
    console.log(`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}?tab=contract`);
    process.exit(0);
  }
}

console.log("\n✗ None of the EVM versions matched.");
console.log("Try manual verification at:");
console.log(`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}?tab=contract`);
