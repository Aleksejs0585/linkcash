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
  isAuthCancellation,
  isStaleCircleDeviceIdError,
  shouldClearStoredUserSession,
  shouldResetCircleDeviceBinding,
} from "../lib/auth-errors";
import {
  clearAutoClaimAfterAuth,
  clearOAuthFlowState,
  saveOAuthReturnTarget,
} from "@/lib/client/oauth-return";
import {
  clearGoogleDisplayName,
  extractGoogleDisplayName,
  extractGoogleEmail,
  persistGoogleDisplayName,
  persistGoogleEmail,
  persistLoginMethod,
  readGoogleDisplayName,
  readGoogleEmail,
} from "@/lib/client/google-display-name";
import {
  clearCircleSession,
  readCircleSession,
  writeCircleSession,
  type CircleSessionCredentials,
} from "../lib/circle-session";

async function tryRefreshUserToken(
  refreshToken: string
): Promise<CircleSessionCredentials | null> {
  try {
    const response = await fetch("/api/circle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refreshUserToken", refreshToken }),
    });
    const data = (await response.json()) as {
      userToken?: string;
      encryptionKey?: string;
      refreshToken?: string;
    };
    if (!response.ok || !data.userToken || !data.encryptionKey) return null;
    return {
      userToken: data.userToken,
      encryptionKey: data.encryptionKey,
      refreshToken: data.refreshToken ?? refreshToken,
    };
  } catch {
    return null;
  }
}

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
  googleEmail: string | null;
  login: () => Promise<void>;
  loginWithEmail: (email: string) => Promise<void>;
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
  googleEmail: null,
  login: async () => {
    /* no-op when Circle env is missing */
  },
  loginWithEmail: async () => {
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

const DEVICE_ID_COOKIE = "linkcash.deviceId";

function stampDeviceBindingCookies(
  boundDeviceId: string,
  dt: string,
  dek: string
) {
  setCookie("deviceToken", dt);
  setCookie("deviceEncryptionKey", dek);
  setCookie("appId", appId);
  setCookie("google.clientId", googleClientId);
  setCookie(DEVICE_ID_COOKIE, boundDeviceId);
}

function clearCircleDeviceBindingCookies() {
  deleteCookie("deviceToken");
  deleteCookie("deviceEncryptionKey");
  deleteCookie("appId");
  deleteCookie("google.clientId");
  deleteCookie(DEVICE_ID_COOKIE);
}

function canReuseStampedDeviceCookies(boundDeviceId: string): boolean {
  const existingDt = (getCookie("deviceToken") as string) || "";
  const existingDek = (getCookie("deviceEncryptionKey") as string) || "";
  const cookieApp = (getCookie("appId") as string) || "";
  const cookieGoogle = (getCookie("google.clientId") as string) || "";
  const cookieDeviceId = (getCookie(DEVICE_ID_COOKIE) as string) || "";

  return (
    Boolean(existingDt && existingDek) &&
    cookieApp === appId &&
    (cookieGoogle || "") === googleClientId &&
    cookieDeviceId === boundDeviceId
  );
}

function CircleWalletInner({ children }: { children: ReactNode }) {
  const sdkRef = useRef<W3SSdk | null>(null);
  const deviceBootstrapRecoveryAttempted = useRef(false);
  const deviceRebindRetryPendingRef = useRef(false);
  const loginAutoRetryUsedRef = useRef(false);
  const loginInFlightRef = useRef(false);
  const pendingEmailRef = useRef<string | null>(null);
  const sessionHydrateAttemptedRef = useRef(false);
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
  const [sessionHydrating, setSessionHydrating] = useState(() => {
    if (typeof window === "undefined") return false;
    return readCircleSession() !== null;
  });
  const [googleDisplayName, setGoogleDisplayName] = useState<string | null>(
    () => readGoogleDisplayName()
  );
  const [googleEmail, setGoogleEmail] = useState<string | null>(() =>
    readGoogleEmail()
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
        // Retry listWallets — a freshly-issued OAuth token can transiently
        // return "invalid credentials" before Circle's backend registers it.
        let current: CircleChainWallet[] = [];
        let listErr: Error | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            current = await postCircle<{ wallets: CircleChainWallet[] }>({
              action: "listWallets",
              userToken: token,
            }).then((d) => d.wallets ?? []);
            listErr = null;
            break;
          } catch (e) {
            listErr = e instanceof Error ? e : new Error("Failed to list wallets.");
            if (attempt < 2) await new Promise((r) => setTimeout(r, 1200));
          }
        }
        if (listErr) throw listErr;

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

  const resetCircleDeviceBinding = useCallback(() => {
    clearCircleDeviceBindingCookies();
    setDeviceToken("");
    setDeviceEncryptionKey("");
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("deviceId");
    }
    setDeviceId("");
    setDeviceIdResetKey((k) => k + 1);
  }, []);

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
    stampDeviceBindingCookies(id, data.deviceToken, data.deviceEncryptionKey);
    return data;
  }, []);

  const applySdkLoginConfigs = useCallback(
    (sdk: W3SSdk, boundDeviceId: string, dt: string, dek: string) => {
      stampDeviceBindingCookies(boundDeviceId, dt, dek);
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
    },
    []
  );

  const scheduleDeviceRebindRetry = useCallback(() => {
    deviceRebindRetryPendingRef.current = true;
    loginAutoRetryUsedRef.current = false;
    resetCircleDeviceBinding();
    setAuthError("Refreshing wallet session…");
  }, [resetCircleDeviceBinding]);

  const scheduleDeviceRebindRetryRef = useRef(scheduleDeviceRebindRetry);
  useEffect(() => {
    scheduleDeviceRebindRetryRef.current = scheduleDeviceRebindRetry;
  });

  const performGoogleLogin = useCallback(async () => {
    if (loginInFlightRef.current) {
      throw new Error("Sign-in is already in progress. Please wait a moment.");
    }
    const sdk = sdkRef.current;
    if (!sdk) {
      throw new Error("Wallet is still loading. Try again in a moment.");
    }
    if (!deviceId) {
      throw new Error("Missing device id.");
    }

    loginInFlightRef.current = true;
    try {
      const { deviceToken: dt, deviceEncryptionKey: dek } =
        await createDeviceToken(deviceId);
      applySdkLoginConfigs(sdk, deviceId, dt, dek);
      await sdk.performLogin(SocialLoginProvider.GOOGLE);
    } finally {
      loginInFlightRef.current = false;
    }
  }, [applySdkLoginConfigs, createDeviceToken, deviceId]);

  const performEmailLogin = useCallback(
    async (email: string) => {
      if (loginInFlightRef.current) {
        throw new Error("Sign-in is already in progress. Please wait a moment.");
      }
      const sdk = sdkRef.current;
      if (!sdk) {
        throw new Error("Wallet is still loading. Try again in a moment.");
      }
      if (!deviceId || !deviceToken || !deviceEncryptionKey) {
        throw new Error("Wallet is still loading. Try again in a moment.");
      }

      loginInFlightRef.current = true;
      try {
        const data = await postCircle<{ otpToken: string }>({
          action: "sendEmailOtp",
          email,
          deviceId,
        });

        pendingEmailRef.current = email;

        sdk.updateConfigs({
          appSettings: { appId },
          loginConfigs: {
            deviceToken,
            deviceEncryptionKey,
            otpToken: data.otpToken,
          },
        });

        sdk.verifyOtp();
      } finally {
        loginInFlightRef.current = false;
      }
    },
    [deviceId, deviceToken, deviceEncryptionKey]
  );

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
            setUserToken(null);
            setEncryptionKey(null);

            if (isAuthCancellation(raw)) {
              deviceRebindRetryPendingRef.current = false;
              clearOAuthFlowState();
              setAuthError(formatCircleAuthError(raw));
              return;
            }

            if (shouldResetCircleDeviceBinding(raw)) {
              if (!loginAutoRetryUsedRef.current) {
                scheduleDeviceRebindRetryRef.current();
                return;
              }
              deviceRebindRetryPendingRef.current = false;
            } else {
              deviceRebindRetryPendingRef.current = false;
              clearOAuthFlowState();
            }

            setAuthError(formatCircleAuthError(raw));
            return;
          }

          deviceRebindRetryPendingRef.current = false;
          loginAutoRetryUsedRef.current = false;

          if (!result) {
            setAuthError("Sign-in returned no credentials.");
            return;
          }

          setAuthError(null);
          const isEmailOtp = !result?.oAuthInfo && pendingEmailRef.current !== null;
          persistLoginMethod(isEmailOtp ? "email" : "google");
          const profileName = extractGoogleDisplayName(result);
          if (profileName) {
            persistGoogleDisplayName(profileName);
            setGoogleDisplayName(profileName);
          }
          // For email OTP login oAuthInfo is absent — fall back to the address we sent the code to
          const profileEmail = extractGoogleEmail(result) ?? pendingEmailRef.current;
          pendingEmailRef.current = null;
          if (profileEmail) {
            persistGoogleEmail(profileEmail);
            setGoogleEmail(profileEmail);
            if (!profileName) {
              const localPart = profileEmail.split("@")[0] ?? profileEmail;
              persistGoogleDisplayName(localPart);
              setGoogleDisplayName(localPart);
            }
          }
          setUserToken(result.userToken);
          setEncryptionKey(result.encryptionKey);
          writeCircleSession({
            userToken: result.userToken,
            encryptionKey: result.encryptionKey,
            refreshToken: result.refreshToken ?? "",
          });

          void (async () => {
            if (cancelled) return;
            try {
              await ensureWalletReady(result.userToken, result.encryptionKey);
              // Navigation handled by OAuthReturnResume (router.push, no page reload).
            } catch (e) {
              clearAutoClaimAfterAuth();
              const raw =
                e instanceof Error
                  ? e.message
                  : "Wallet setup failed after login.";
              if (
                shouldResetCircleDeviceBinding(raw) &&
                !loginAutoRetryUsedRef.current
              ) {
                clearCircleSession();
                setUserToken(null);
                setEncryptionKey(null);
                scheduleDeviceRebindRetryRef.current();
                return;
              }
              if (shouldClearStoredUserSession(raw)) {
                clearCircleSession();
                setUserToken(null);
                setEncryptionKey(null);
                setWallets([]);
              }
              setAuthError(formatCircleAuthError(raw));
            }
          })();
        };

        const restoredDeviceToken = (getCookie("deviceToken") as string) || "";
        const restoredDeviceEncryptionKey =
          (getCookie("deviceEncryptionKey") as string) || "";

        const initialConfig = {
          appSettings: { appId },
          loginConfigs: {
            deviceToken: restoredDeviceToken,
            deviceEncryptionKey: restoredDeviceEncryptionKey,
            google: {
              clientId: googleClientId,
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

    let isMounted = true;

    const run = async () => {
      try {
        const cached =
          typeof window !== "undefined"
            ? window.localStorage.getItem("deviceId")
            : null;

        if (cached) {
          if (isMounted) setDeviceId(cached);
          return;
        }

        const id = await sdkRef.current!.getDeviceId();
        if (isMounted) {
          setDeviceId(id);
          window.localStorage.setItem("deviceId", id);
        }
      } catch (e) {
        if (isMounted) {
          setBootstrapError(
            e instanceof Error ? e.message : "Failed to read device id."
          );
        }
      }
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, [sdkReady, deviceIdResetKey]);

  useEffect(() => {
    if (!sdkReady || !deviceId || deviceToken) return;

    void (async () => {
      try {
        if (canReuseStampedDeviceCookies(deviceId)) {
          const existingDt = (getCookie("deviceToken") as string) || "";
          const existingDek =
            (getCookie("deviceEncryptionKey") as string) || "";
          setDeviceToken(existingDt);
          setDeviceEncryptionKey(existingDek);
          const sdk = sdkRef.current;
          if (sdk) {
            applySdkLoginConfigs(sdk, deviceId, existingDt, existingDek);
          }
          return;
        }

        const fresh = await createDeviceToken(deviceId);
        const sdk = sdkRef.current;
        if (sdk) {
          applySdkLoginConfigs(
            sdk,
            deviceId,
            fresh.deviceToken,
            fresh.deviceEncryptionKey
          );
        }
      } catch (e) {
        const raw =
          e instanceof Error ? e.message : "Failed to create device token.";
        if (
          !deviceBootstrapRecoveryAttempted.current &&
          isStaleCircleDeviceIdError(raw)
        ) {
          deviceBootstrapRecoveryAttempted.current = true;
          resetCircleDeviceBinding();
          return;
        }
        setBootstrapError(formatCircleAuthError(raw));
      }
    })();
  }, [
    sdkReady,
    deviceId,
    deviceToken,
    createDeviceToken,
    applySdkLoginConfigs,
    resetCircleDeviceBinding,
  ]);

  useEffect(() => {
    if (!sdkReady || !deviceToken || !deviceEncryptionKey) return;

    const session = readCircleSession();
    if (!session) return;
    if (sessionHydrateAttemptedRef.current) return;

    // OAuth callback already set tokens and is running ensureWalletReady.
    if (userToken && encryptionKey) {
      sessionHydrateAttemptedRef.current = true;
      return;
    }

    sessionHydrateAttemptedRef.current = true;

    void (async () => {
      setUserToken(session.userToken);
      setEncryptionKey(session.encryptionKey);
      try {
        await ensureWalletReady(session.userToken, session.encryptionKey);
      } catch (e) {
        const raw =
          e instanceof Error
            ? e.message
            : "Session expired. Please sign in again with Google.";

        // Try silent refresh before giving up
        if (shouldClearStoredUserSession(raw) && session.refreshToken) {
          const refreshed = await tryRefreshUserToken(session.refreshToken);
          if (refreshed) {
            writeCircleSession(refreshed);
            setUserToken(refreshed.userToken);
            setEncryptionKey(refreshed.encryptionKey);
            try {
              await ensureWalletReady(refreshed.userToken, refreshed.encryptionKey);
              return;
            } catch {
              // refresh succeeded but wallet load failed — fall through
            }
          }
        }

        if (shouldResetCircleDeviceBinding(raw) && !loginAutoRetryUsedRef.current) {
          clearCircleSession();
          setUserToken(null);
          setEncryptionKey(null);
          setWallets([]);
          scheduleDeviceRebindRetry();
          return;
        }
        if (shouldClearStoredUserSession(raw)) {
          clearCircleSession();
          setUserToken(null);
          setEncryptionKey(null);
          setWallets([]);
        }
        setAuthError(formatCircleAuthError(raw));
      } finally {
        setSessionHydrating(false);
      }
    })();
  }, [
    sdkReady,
    deviceToken,
    deviceEncryptionKey,
    ensureWalletReady,
    userToken,
    encryptionKey,
    scheduleDeviceRebindRetry,
  ]);

  const ready =
    sdkReady &&
    Boolean(deviceId) &&
    Boolean(deviceToken) &&
    Boolean(deviceEncryptionKey) &&
    !bootstrapError &&
    !sessionHydrating;

  // Silently refresh the Circle userToken every 25 minutes to keep session alive
  useEffect(() => {
    if (!authenticated || !userToken || !encryptionKey) return;
    const session = readCircleSession();
    if (!session?.refreshToken) return;

    const id = window.setInterval(async () => {
      const currentSession = readCircleSession();
      if (!currentSession?.refreshToken) return;
      const refreshed = await tryRefreshUserToken(currentSession.refreshToken);
      if (refreshed) {
        writeCircleSession(refreshed);
        setUserToken(refreshed.userToken);
        setEncryptionKey(refreshed.encryptionKey);
      }
    }, 25 * 60 * 1000); // 25 minutes

    return () => window.clearInterval(id);
  }, [authenticated, userToken, encryptionKey]);

  // Persist email → walletAddress mapping whenever both are known
  const identifiedRef = useRef<string | null>(null);
  useEffect(() => {
    const addr = pickArcWallet(wallets)?.address ?? null;
    if (!addr || !googleEmail) return;
    const key = `${addr}:${googleEmail}`;
    if (identifiedRef.current === key) return;
    identifiedRef.current = key;
    void fetch("/api/identify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress: addr, email: googleEmail }),
    }).catch(() => undefined);
  }, [wallets, googleEmail]);

  useEffect(() => {
    if (!deviceRebindRetryPendingRef.current || loginAutoRetryUsedRef.current) {
      return;
    }
    if (!sdkReady || !deviceId || !deviceToken || !deviceEncryptionKey) return;

    loginAutoRetryUsedRef.current = true;
    saveOAuthReturnTarget();
    void performGoogleLogin().catch((e) => {
      deviceRebindRetryPendingRef.current = false;
      const raw = e instanceof Error ? e.message : "Sign-in failed to start.";
      if (isAuthCancellation(raw)) {
        clearOAuthFlowState();
      }
      setAuthError(formatCircleAuthError(raw));
    });
  }, [
    sdkReady,
    deviceId,
    deviceToken,
    deviceEncryptionKey,
    deviceIdResetKey,
    performGoogleLogin,
  ]);

  const login = useCallback(async () => {
    setAuthError(null);
    saveOAuthReturnTarget();
    loginAutoRetryUsedRef.current = false;

    try {
      await performGoogleLogin();
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Sign-in failed to start.";
      if (isAuthCancellation(raw)) {
        clearOAuthFlowState();
        setAuthError(formatCircleAuthError(raw));
        return;
      }
      if (shouldResetCircleDeviceBinding(raw) && !loginAutoRetryUsedRef.current) {
        scheduleDeviceRebindRetry();
        return;
      }
      deviceRebindRetryPendingRef.current = false;
      setAuthError(formatCircleAuthError(raw));
    }
  }, [performGoogleLogin, scheduleDeviceRebindRetry]);

  const loginWithEmail = useCallback(
    async (email: string) => {
      setAuthError(null);
      saveOAuthReturnTarget();
      loginAutoRetryUsedRef.current = false;

      try {
        await performEmailLogin(email);
      } catch (e) {
        const raw = e instanceof Error ? e.message : "Sign-in failed to start.";
        pendingEmailRef.current = null;
        setAuthError(formatCircleAuthError(raw));
      }
    },
    [performEmailLogin]
  );

  const logout = useCallback(() => {
    deviceRebindRetryPendingRef.current = false;
    loginAutoRetryUsedRef.current = false;
    sessionHydrateAttemptedRef.current = false;
    setSessionHydrating(false);
    clearOAuthFlowState();
    clearCircleSession();
    clearGoogleDisplayName();
    clearCircleDeviceBindingCookies();
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("deviceId");
    }
    setUserToken(null);
    setEncryptionKey(null);
    setGoogleDisplayName(null);
    setGoogleEmail(null);
    setWallets([]);
    setAuthError(null);
    setDeviceId("");
    setDeviceToken("");
    setDeviceEncryptionKey("");
    setDeviceIdResetKey((k) => k + 1);
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
      try {
        await executeChallengePromise(sdk, challengeId, {
          userToken,
          encryptionKey,
        });
      } catch (e) {
        const raw = e instanceof Error ? e.message : String(e);
        if (shouldResetCircleDeviceBinding(raw)) {
          clearCircleSession();
          setUserToken(null);
          setEncryptionKey(null);
          setWallets([]);
          setDeviceIdResetKey((k) => k + 1);
        }
        throw e;
      }
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
      googleEmail,
      login,
      loginWithEmail,
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
      googleEmail,
      login,
      loginWithEmail,
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
