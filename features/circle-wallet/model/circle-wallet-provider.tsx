"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { deleteCookie, getCookie, setCookie } from "cookies-next/client";
import type { W3SSdk } from "@circle-fin/w3s-pw-web-sdk";
import { SocialLoginProvider } from "@circle-fin/w3s-pw-web-sdk/dist/src/types";
import type { Authentication } from "@circle-fin/w3s-pw-web-sdk/dist/src/types";
import { isCircleWalletConfigured } from "../config/circle-env";
import {
  formatCircleAuthError,
  isStaleCircleDeviceIdError,
  shouldResetCircleDeviceBinding,
} from "../lib/auth-errors";
import {
  clearOAuthFlowState,
  resumeOAuthReturnTarget,
  saveOAuthReturnTarget,
} from "@/lib/client/oauth-return";
import {
  clearGoogleDisplayName,
  extractGoogleDisplayName,
  persistGoogleDisplayName,
  readGoogleDisplayName,
} from "@/lib/client/google-display-name";
import {
  clearCircleSession,
  readCircleSession,
  writeCircleSession,
} from "../lib/circle-session";

const CIRCLE_USER_WAS_INITIALIZED = 155106;

export type CircleChainWallet = {
  id: string;
  address: string;
  blockchain: string;
};

type CircleWalletContextValue = {
  ready: boolean;
  authenticated: boolean;
  walletAddress: string | null;
  primaryWalletId: string | null;
  userToken: string | null;
  encryptionKey: string | null;
  googleDisplayName: string | null;
  login: () => Promise<void>;
  logout: () => void;
  executeChallenge: (challengeId: string) => Promise<void>;
  authError: string | null;
  bootstrapError: string | null;
  walletSyncing: boolean;
};

const unconfiguredValue: CircleWalletContextValue = {
  ready: true,
  authenticated: false,
  walletAddress: null,
  primaryWalletId: null,
  userToken: null,
  encryptionKey: null,
  googleDisplayName: null,
  login: async () => {
    /* no-op when Circle env is missing */
  },
  logout: () => {
    /* no-op */
  },
  executeChallenge: async () => {
    /* no-op */
  },
  authError: null,
  bootstrapError: null,
  walletSyncing: false,
};

const CircleWalletContext = createContext<CircleWalletContextValue | null>(
  null
);

function pickArcWallet(
  wallets: CircleChainWallet[]
): CircleChainWallet | null {
  const onArc = wallets.find((w) => w.blockchain === "ARC-TESTNET");
  return onArc ?? wallets[0] ?? null;
}

async function postCircle<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/circle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as T & {
    error?: string;
    code?: number;
    message?: string;
  };
  if (!response.ok) {
    const msg =
      typeof data.error === "string"
        ? data.error
        : typeof data.message === "string"
          ? data.message
          : `Circle API error (${response.status})`;
    throw new Error(msg);
  }
  return data as T;
}

function executeChallengePromise(
  sdk: W3SSdk,
  challengeId: string,
  auth: Authentication
): Promise<void> {
  sdk.setAuthentication(auth);
  return new Promise((resolve, reject) => {
    sdk.execute(challengeId, (error) => {
      if (error) {
        reject(new Error(error.message ?? "Wallet setup was cancelled."));
        return;
      }
      resolve();
    });
  });
}

const appId = process.env.NEXT_PUBLIC_CIRCLE_APP_ID ?? "";
const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

/** Drop device cookies if they belong to another Circle app or Google client. */
function purgeStaleCircleDeviceCookies() {
  if (typeof window === "undefined") return;
  if (!appId || !googleClientId) return;

  const cookieApp = (getCookie("appId") as string) || "";
  const cookieGoogle = (getCookie("google.clientId") as string) || "";
  const hasDevice = Boolean(getCookie("deviceToken"));
  if (!hasDevice) return;

  const appStale = cookieApp !== appId;
  const googleStale = (cookieGoogle || "") !== googleClientId;

  if (appStale || googleStale) {
    deleteCookie("deviceToken");
    deleteCookie("deviceEncryptionKey");
    deleteCookie("appId");
    deleteCookie("google.clientId");
  }
}

function clearCircleDeviceBindingCookies() {
  deleteCookie("deviceToken");
  deleteCookie("deviceEncryptionKey");
  deleteCookie("appId");
  deleteCookie("google.clientId");
}

function CircleWalletInner({ children }: { children: ReactNode }) {
  const sdkRef = useRef<W3SSdk | null>(null);
  const deviceBootstrapRecoveryAttempted = useRef(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [deviceIdResetKey, setDeviceIdResetKey] = useState(0);
  const [deviceToken, setDeviceToken] = useState("");
  const [deviceEncryptionKey, setDeviceEncryptionKey] = useState("");
  const [userToken, setUserToken] = useState<string | null>(null);
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);
  const [wallets, setWallets] = useState<CircleChainWallet[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [walletSyncing, setWalletSyncing] = useState(false);
  const [googleDisplayName, setGoogleDisplayName] = useState<string | null>(
    () => readGoogleDisplayName()
  );

  const walletAddress = useMemo(
    () => pickArcWallet(wallets)?.address ?? null,
    [wallets]
  );

  const primaryWalletId = useMemo(
    () => pickArcWallet(wallets)?.id ?? null,
    [wallets]
  );

  const authenticated = Boolean(userToken && encryptionKey);

  const ensureWalletReady = useCallback(
    async (token: string, encKey: string) => {
      const sdk = sdkRef.current;
      if (!sdk) {
        throw new Error("Wallet SDK is not ready.");
      }

      setWalletSyncing(true);
      setAuthError(null);

      try {
        let current = await postCircle<{ wallets: CircleChainWallet[] }>({
          action: "listWallets",
          userToken: token,
        }).then((d) => d.wallets ?? []);

        if (current.length > 0) {
          setWallets(current);
          return;
        }

        const initResponse = await fetch("/api/circle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "initializeUser",
            userToken: token,
          }),
        });
        const initJson = (await initResponse.json()) as {
          challengeId?: string;
          code?: number;
          message?: string;
        };

        if (!initResponse.ok) {
          if (initJson.code === CIRCLE_USER_WAS_INITIALIZED) {
            current = await postCircle<{ wallets: CircleChainWallet[] }>({
              action: "listWallets",
              userToken: token,
            }).then((d) => d.wallets ?? []);
            setWallets(current);
            return;
          }
          throw new Error(
            typeof initJson.message === "string"
              ? initJson.message
              : "Failed to initialize Circle user."
          );
        }

        const challengeId = initJson.challengeId;
        if (!challengeId) {
          throw new Error("Missing challengeId from Circle.");
        }

        await executeChallengePromise(sdk, challengeId, {
          userToken: token,
          encryptionKey: encKey,
        });

        await new Promise((r) => setTimeout(r, 2000));

        current = await postCircle<{ wallets: CircleChainWallet[] }>({
          action: "listWallets",
          userToken: token,
        }).then((d) => d.wallets ?? []);

        setWallets(current);
      } finally {
        setWalletSyncing(false);
      }
    },
    []
  );

  const createDeviceToken = useCallback(async (id: string) => {
    const data = await postCircle<{
      deviceToken: string;
      deviceEncryptionKey: string;
    }>({
      action: "createDeviceToken",
      deviceId: id,
    });
    setDeviceToken(data.deviceToken);
    setDeviceEncryptionKey(data.deviceEncryptionKey);
    setCookie("deviceToken", data.deviceToken);
    setCookie("deviceEncryptionKey", data.deviceEncryptionKey);
    setCookie("appId", appId);
    setCookie("google.clientId", googleClientId);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initSdk = async () => {
      try {
        const { W3SSdk } = await import("@circle-fin/w3s-pw-web-sdk");

        purgeStaleCircleDeviceCookies();

        const onLoginComplete = (
          error: unknown,
          result:
            | {
                userToken: string;
                encryptionKey: string;
                refreshToken: string;
                oAuthInfo?: {
                  name?: string;
                  email?: string;
                  socialUserInfo?: { name?: string };
                };
              }
            | undefined
        ) => {
          if (cancelled) return;

          if (error) {
            const err = error as { message?: string };
            const raw = err.message ?? "Sign-in failed.";
            if (shouldResetCircleDeviceBinding(raw)) {
              clearCircleDeviceBindingCookies();
              setDeviceToken("");
              setDeviceEncryptionKey("");
              if (typeof window !== "undefined") {
                window.localStorage.removeItem("deviceId");
              }
              setDeviceId("");
              setDeviceIdResetKey((k) => k + 1);
            }
            clearOAuthFlowState();
            setAuthError(formatCircleAuthError(raw));
            setUserToken(null);
            setEncryptionKey(null);
            return;
          }

          if (!result) {
            setAuthError("Sign-in returned no credentials.");
            return;
          }

          setAuthError(null);
          const profileName = extractGoogleDisplayName(result);
          if (profileName) {
            persistGoogleDisplayName(profileName);
            setGoogleDisplayName(profileName);
          }
          setUserToken(result.userToken);
          setEncryptionKey(result.encryptionKey);
          writeCircleSession({
            userToken: result.userToken,
            encryptionKey: result.encryptionKey,
            refreshToken: result.refreshToken ?? "",
          });

          void (async () => {
            try {
              await ensureWalletReady(result.userToken, result.encryptionKey);
              resumeOAuthReturnTarget();
            } catch (e) {
              clearOAuthFlowState();
              setAuthError(
                formatCircleAuthError(
                  e instanceof Error
                    ? e.message
                    : "Wallet setup failed after login."
                )
              );
            }
          })();
        };

        const restoredAppId = (getCookie("appId") as string) || appId || "";
        const restoredGoogleClientId =
          (getCookie("google.clientId") as string) || googleClientId || "";
        const restoredDeviceToken = (getCookie("deviceToken") as string) || "";
        const restoredDeviceEncryptionKey =
          (getCookie("deviceEncryptionKey") as string) || "";

        const initialConfig = {
          appSettings: { appId: restoredAppId },
          loginConfigs: {
            deviceToken: restoredDeviceToken,
            deviceEncryptionKey: restoredDeviceEncryptionKey,
            google: {
              clientId: restoredGoogleClientId,
              redirectUri:
                typeof window !== "undefined" ? window.location.origin : "",
              selectAccountPrompt: true,
            },
          },
        };

        const sdk = new W3SSdk(initialConfig, onLoginComplete);
        sdkRef.current = sdk;

        if (!cancelled) {
          setSdkReady(true);
        }
      } catch (e) {
        if (!cancelled) {
          setBootstrapError(
            e instanceof Error ? e.message : "Failed to load Circle wallet SDK."
          );
        }
      }
    };

    void initSdk();

    return () => {
      cancelled = true;
    };
  }, [ensureWalletReady]);

  useEffect(() => {
    if (!sdkReady || !sdkRef.current) return;

    const run = async () => {
      try {
        const cached =
          typeof window !== "undefined"
            ? window.localStorage.getItem("deviceId")
            : null;

        if (cached) {
          setDeviceId(cached);
          return;
        }

        const id = await sdkRef.current!.getDeviceId();
        setDeviceId(id);
        window.localStorage.setItem("deviceId", id);
      } catch (e) {
        setBootstrapError(
          e instanceof Error ? e.message : "Failed to read device id."
        );
      }
    };

    void run();
  }, [sdkReady, deviceIdResetKey]);

  useEffect(() => {
    if (!sdkReady || !deviceId || deviceToken) return;

    void (async () => {
      try {
        const existingDt = (getCookie("deviceToken") as string) || "";
        const existingDek =
          (getCookie("deviceEncryptionKey") as string) || "";
        const cookieApp = (getCookie("appId") as string) || "";
        const cookieGoogle = (getCookie("google.clientId") as string) || "";

        const stampedCookiesMatch =
          existingDt &&
          existingDek &&
          cookieApp === appId &&
          (cookieGoogle || "") === googleClientId;

        if (stampedCookiesMatch) {
          setDeviceToken(existingDt);
          setDeviceEncryptionKey(existingDek);
          const sdk = sdkRef.current;
          if (sdk && typeof window !== "undefined") {
            sdk.updateConfigs({
              appSettings: { appId },
              loginConfigs: {
                deviceToken: existingDt,
                deviceEncryptionKey: existingDek,
                google: {
                  clientId: googleClientId,
                  redirectUri: window.location.origin,
                  selectAccountPrompt: true,
                },
              },
            });
          }
          return;
        }

        await createDeviceToken(deviceId);
        const sdk = sdkRef.current;
        if (sdk && typeof window !== "undefined") {
          const dt = (getCookie("deviceToken") as string) || "";
          const dek = (getCookie("deviceEncryptionKey") as string) || "";
          if (dt && dek) {
            sdk.updateConfigs({
              appSettings: { appId },
              loginConfigs: {
                deviceToken: dt,
                deviceEncryptionKey: dek,
                google: {
                  clientId: googleClientId,
                  redirectUri: window.location.origin,
                  selectAccountPrompt: true,
                },
              },
            });
          }
        }
      } catch (e) {
        const raw =
          e instanceof Error ? e.message : "Failed to create device token.";
        if (
          !deviceBootstrapRecoveryAttempted.current &&
          isStaleCircleDeviceIdError(raw)
        ) {
          deviceBootstrapRecoveryAttempted.current = true;
          if (typeof window !== "undefined") {
            window.localStorage.removeItem("deviceId");
          }
          clearCircleDeviceBindingCookies();
          setDeviceToken("");
          setDeviceEncryptionKey("");
          setDeviceId("");
          setDeviceIdResetKey((k) => k + 1);
          return;
        }
        setBootstrapError(formatCircleAuthError(raw));
      }
    })();
  }, [sdkReady, deviceId, deviceToken, createDeviceToken]);

  useEffect(() => {
    if (!sdkReady || !deviceToken || !deviceEncryptionKey) return;

    const session = readCircleSession();
    if (!session) return;

    void (async () => {
      setUserToken(session.userToken);
      setEncryptionKey(session.encryptionKey);
      try {
        await ensureWalletReady(session.userToken, session.encryptionKey);
      } catch (e) {
        clearCircleSession();
        setUserToken(null);
        setEncryptionKey(null);
        setWallets([]);
        setAuthError(
          formatCircleAuthError(
            e instanceof Error
              ? e.message
              : "Session expired. Please sign in again with Google."
          )
        );
      }
    })();
  }, [sdkReady, deviceToken, deviceEncryptionKey, ensureWalletReady]);

  const ready =
    sdkReady &&
    Boolean(deviceId) &&
    Boolean(deviceToken) &&
    Boolean(deviceEncryptionKey) &&
    !bootstrapError;

  const login = useCallback(async () => {
    setAuthError(null);
    const sdk = sdkRef.current;
    if (!sdk) {
      setAuthError("Wallet is still loading. Try again in a moment.");
      return;
    }
    if (!deviceId) {
      setAuthError("Missing device id.");
      return;
    }

    try {
      let dt = deviceToken;
      let dek = deviceEncryptionKey;
      if (!dt || !dek) {
        const fresh = await postCircle<{
          deviceToken: string;
          deviceEncryptionKey: string;
        }>({
          action: "createDeviceToken",
          deviceId,
        });
        dt = fresh.deviceToken;
        dek = fresh.deviceEncryptionKey;
        setDeviceToken(dt);
        setDeviceEncryptionKey(dek);
        setCookie("deviceToken", dt);
        setCookie("deviceEncryptionKey", dek);
      }

      setCookie("appId", appId);
      setCookie("google.clientId", googleClientId);
      setCookie("deviceToken", dt);
      setCookie("deviceEncryptionKey", dek);

      sdk.updateConfigs({
        appSettings: { appId },
        loginConfigs: {
          deviceToken: dt,
          deviceEncryptionKey: dek,
          google: {
            clientId: googleClientId,
            redirectUri: window.location.origin,
            selectAccountPrompt: true,
          },
        },
      });

      await sdk.performLogin(SocialLoginProvider.GOOGLE);
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Sign-in failed to start.";
      if (shouldResetCircleDeviceBinding(raw)) {
        clearCircleDeviceBindingCookies();
        setDeviceToken("");
        setDeviceEncryptionKey("");
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("deviceId");
        }
        setDeviceId("");
        setDeviceIdResetKey((k) => k + 1);
      }
      clearOAuthFlowState();
      setAuthError(formatCircleAuthError(raw));
    }
  }, [deviceEncryptionKey, deviceId, deviceToken]);

  const logout = useCallback(() => {
    clearOAuthFlowState();
    clearCircleSession();
    clearGoogleDisplayName();
    clearCircleDeviceBindingCookies();
    setUserToken(null);
    setEncryptionKey(null);
    setGoogleDisplayName(null);
    setWallets([]);
    setAuthError(null);
    setDeviceToken("");
    setDeviceEncryptionKey("");
  }, []);

  const executeChallenge = useCallback(
    async (challengeId: string) => {
      const sdk = sdkRef.current;
      if (!sdk) {
        throw new Error("Wallet SDK is not ready.");
      }
      if (!userToken || !encryptionKey) {
        throw new Error("You must be signed in.");
      }
      await executeChallengePromise(sdk, challengeId, {
        userToken,
        encryptionKey,
      });
    },
    [userToken, encryptionKey]
  );

  const value = useMemo<CircleWalletContextValue>(
    () => ({
      ready,
      authenticated,
      walletAddress,
      primaryWalletId,
      userToken,
      encryptionKey,
      googleDisplayName,
      login,
      logout,
      executeChallenge,
      authError,
      bootstrapError,
      walletSyncing,
    }),
    [
      authError,
      authenticated,
      bootstrapError,
      encryptionKey,
      executeChallenge,
      googleDisplayName,
      login,
      logout,
      primaryWalletId,
      ready,
      userToken,
      walletAddress,
      walletSyncing,
    ]
  );

  return (
    <CircleWalletContext.Provider value={value}>
      {children}
    </CircleWalletContext.Provider>
  );
}

export function CircleWalletProvider({ children }: { children: ReactNode }) {
  const configured = isCircleWalletConfigured();

  if (!configured) {
    return (
      <CircleWalletContext.Provider value={unconfiguredValue}>
        {children}
      </CircleWalletContext.Provider>
    );
  }

  return <CircleWalletInner>{children}</CircleWalletInner>;
}

export function useCircleWallet(): CircleWalletContextValue {
  const ctx = useContext(CircleWalletContext);
  if (!ctx) {
    throw new Error("useCircleWallet must be used within CircleWalletProvider.");
  }
  return ctx;
}
