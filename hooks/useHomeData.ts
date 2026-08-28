"use client";

import { useEffect, useState } from "react";
import type { HomeDataV2 } from "@/lib/typesV2";

export function useHomeData() {
  const [data, setData] = useState<HomeDataV2 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/home", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Erro ao carregar plano");
        return (await response.json()) as HomeDataV2;
      })
      .then((payload) => {
        if (active) setData(payload);
      })
      .catch(() => {
        if (active) setError("Erro ao carregar dados");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { data, loading, error };
}
