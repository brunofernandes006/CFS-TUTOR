"use client";

import { useState, useEffect } from "react";

export interface HomeData {
  mission: any;
  stats: any;
  reviews: any;
  continueStudying: any[];
  recommended: any[];
  weakPoints: any[];
  byDiscipline: Record<string, any[]>;
  cfs26Icc: any[];
  documents: any[];
  simulations: any[];
}

export function useHomeData() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/home")
      .then((r) => {
        if (!r.ok) throw new Error("Erro ao carregar");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("Erro ao carregar dados"))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
