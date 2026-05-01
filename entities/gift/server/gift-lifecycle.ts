type GiftRecord = {
  hash: string;
  amountUsdc: string;
  refundAddress: string;
  receiverAddress?: string;
  expiresAt: number;
  claimed: boolean;
  reclaimed: boolean;
};

export class GiftLifecycle {
  private readonly gifts = new Map<string, GiftRecord>();

  create(input: {
    hash: string;
    amountUsdc: string;
    refundAddress: string;
    expiresAt: number;
  }) {
    if (this.gifts.has(input.hash)) {
      throw new Error("Gift already exists.");
    }

    this.gifts.set(input.hash, {
      hash: input.hash,
      amountUsdc: input.amountUsdc,
      refundAddress: input.refundAddress,
      expiresAt: input.expiresAt,
      claimed: false,
      reclaimed: false,
    });
  }

  claim(input: { hash: string; receiverAddress: string; nowSec: number }) {
    const gift = this.get(input.hash);
    if (gift.claimed || gift.reclaimed) {
      throw new Error("Gift is no longer claimable.");
    }
    if (input.nowSec >= gift.expiresAt) {
      throw new Error("Gift has expired.");
    }
    gift.claimed = true;
    gift.receiverAddress = input.receiverAddress;
  }

  reclaim(input: { hash: string; nowSec: number }) {
    const gift = this.get(input.hash);
    if (gift.claimed) {
      throw new Error("Claimed gift cannot be reclaimed.");
    }
    if (gift.reclaimed) {
      throw new Error("Gift already reclaimed.");
    }
    if (input.nowSec < gift.expiresAt) {
      throw new Error("Gift is not expired yet.");
    }
    gift.reclaimed = true;
  }

  status(hash: string) {
    const gift = this.get(hash);
    if (gift.reclaimed) return "reclaimed" as const;
    if (gift.claimed) return "claimed" as const;
    return "active" as const;
  }

  private get(hash: string): GiftRecord {
    const gift = this.gifts.get(hash);
    if (!gift) throw new Error("Gift not found.");
    return gift;
  }
}

