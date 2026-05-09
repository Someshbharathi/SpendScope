"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import type { AuditFormValues } from "@/lib/audit-types";
import { loadAuditFormFromStorage, saveAuditFormToStorage } from "@/lib/audit-persistence";

const DEBOUNCE_MS = 320;

export function usePersistedAuditForm(form: UseFormReturn<AuditFormValues>) {
  const [hydrated, setHydrated] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    startTransition(() => {
      const loaded = loadAuditFormFromStorage();
      form.reset(loaded);
      setHydrated(true);
    });
  }, [form]);

  useEffect(() => {
    if (!hydrated) return;

    const subscription = form.watch((value) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        saveAuditFormToStorage(value as AuditFormValues);
      }, DEBOUNCE_MS);
    });

    return () => {
      subscription.unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [form, hydrated]);

  return hydrated;
}
