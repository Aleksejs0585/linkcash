import { isAddress, isHexString, keccak256, ZeroAddress } from "ethers";
import { z } from "zod";
import { HttpError } from "@/lib/server/http-errors";

export type ClaimInput = {
  secret: string;
  paymentIdHash: string;
  receiverAddress: string;
};

const claimSchema = z
  .object({
    secret: z.string().trim(),
    paymentIdHash: z.string().trim(),
    receiverAddress: z.string().trim(),
  })
  .strict();

export function parseClaimInput(body: unknown): ClaimInput {
  const parsed = claimSchema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(400, "Invalid JSON body.", {
      code: "BAD_REQUEST",
      retryable: false,
    });
  }
  const { secret, paymentIdHash, receiverAddress } = parsed.data;
  if (!isHexString(secret, 32)) {
    throw new HttpError(400, "secret must be a bytes32 hex string.", {
      code: "BAD_REQUEST",
    });
  }
  if (!isAddress(receiverAddress)) {
    throw new HttpError(400, "receiverAddress must be a valid address.", {
      code: "BAD_REQUEST",
    });
  }
  if (receiverAddress.toLowerCase() === ZeroAddress.toLowerCase()) {
    throw new HttpError(400, "receiverAddress cannot be the zero address.", {
      code: "BAD_REQUEST",
    });
  }
  if (!isHexString(paymentIdHash, 32)) {
    throw new HttpError(400, "paymentIdHash must be a bytes32 hex string.", {
      code: "BAD_REQUEST",
    });
  }
  const derivedPaymentIdHash = keccak256(secret);
  if (derivedPaymentIdHash.toLowerCase() !== paymentIdHash.toLowerCase()) {
    throw new HttpError(
      400,
      "paymentIdHash does not match the provided secret.",
      { code: "BAD_REQUEST" }
    );
  }

  return { secret, paymentIdHash, receiverAddress };
}

