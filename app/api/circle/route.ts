import { NextResponse } from "next/server";

const CIRCLE_BASE_URL =
  process.env.NEXT_PUBLIC_CIRCLE_BASE_URL ?? "https://api.circle.com";
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY;

export async function POST(request: Request) {
  if (!CIRCLE_API_KEY) {
    return NextResponse.json(
      { error: "CIRCLE_API_KEY is not configured on the server." },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = body.action as string | undefined;
    const params = { ...body };
    delete params.action;

    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    switch (action) {
      case "createDeviceToken": {
        const deviceId = params.deviceId as string | undefined;
        if (!deviceId) {
          return NextResponse.json(
            { error: "Missing deviceId" },
            { status: 400 }
          );
        }

        const response = await fetch(
          `${CIRCLE_BASE_URL}/v1/w3s/users/social/token`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${CIRCLE_API_KEY}`,
            },
            body: JSON.stringify({
              idempotencyKey: crypto.randomUUID(),
              deviceId,
            }),
          }
        );

        const data = (await response.json()) as Record<string, unknown>;

        if (!response.ok) {
          return NextResponse.json(data, { status: response.status });
        }

        const inner = data.data as {
          deviceToken: string;
          deviceEncryptionKey: string;
        };
        return NextResponse.json(inner, { status: 200 });
      }

      case "initializeUser": {
        const userToken = params.userToken as string | undefined;
        if (!userToken) {
          return NextResponse.json(
            { error: "Missing userToken" },
            { status: 400 }
          );
        }

        const response = await fetch(
          `${CIRCLE_BASE_URL}/v1/w3s/user/initialize`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${CIRCLE_API_KEY}`,
              "X-User-Token": userToken,
            },
            body: JSON.stringify({
              idempotencyKey: crypto.randomUUID(),
              accountType: "SCA",
              blockchains: ["ARC-TESTNET"],
            }),
          }
        );

        const data = (await response.json()) as Record<string, unknown>;

        if (!response.ok) {
          return NextResponse.json(data, { status: response.status });
        }

        const inner = data.data as { challengeId: string };
        return NextResponse.json(inner, { status: 200 });
      }

      case "listWallets": {
        const userToken = params.userToken as string | undefined;
        if (!userToken) {
          return NextResponse.json(
            { error: "Missing userToken" },
            { status: 400 }
          );
        }

        const response = await fetch(`${CIRCLE_BASE_URL}/v1/w3s/wallets`, {
          method: "GET",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            Authorization: `Bearer ${CIRCLE_API_KEY}`,
            "X-User-Token": userToken,
          },
        });

        const data = (await response.json()) as Record<string, unknown>;

        if (!response.ok) {
          return NextResponse.json(data, { status: response.status });
        }

        const inner = data.data as { wallets: unknown[] };
        return NextResponse.json(inner, { status: 200 });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in /api/circle:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
