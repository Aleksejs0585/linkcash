"use client";

import { useCallback, useMemo, useState } from "react";

export type AddressBookContact = {
  address: string;
  name: string;
  updatedAt: number;
};

const STORAGE_KEY = "linkcash.address-book.v1";

type AddressBookState = Record<string, AddressBookContact>;

function normalizeAddress(address: string) {
  return address.trim().toLowerCase();
}

export function useAddressBook() {
  const [entries, setEntries] = useState<AddressBookState>(() => {
    if (typeof window === "undefined") {
      return {};
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as AddressBookState;
      return parsed;
    } catch {
      return {};
    }
  });

  const persist = useCallback((next: AddressBookState) => {
    setEntries(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }, []);

  const getContactName = useCallback(
    (address?: string | null) => {
      if (!address) return null;
      const key = normalizeAddress(address);
      return entries[key]?.name ?? null;
    },
    [entries]
  );

  const setContactName = useCallback(
    (address: string, name: string) => {
      const key = normalizeAddress(address);
      const trimmedName = name.trim();
      if (!trimmedName) return;

      const next: AddressBookState = {
        ...entries,
        [key]: {
          address,
          name: trimmedName,
          updatedAt: Date.now(),
        },
      };
      persist(next);
    },
    [entries, persist]
  );

  const removeContact = useCallback(
    (address: string) => {
      const key = normalizeAddress(address);
      const next = { ...entries };
      delete next[key];
      persist(next);
    },
    [entries, persist]
  );

  const contacts = useMemo(
    () =>
      Object.values(entries).sort((a, b) => b.updatedAt - a.updatedAt),
    [entries]
  );

  return {
    contacts,
    getContactName,
    setContactName,
    removeContact,
  };
}
