"use client";

import { useState, useEffect, useCallback } from "react";

export interface MyListItem {
  id: string;
  type: "syllabus" | "document";
  title: string;
  discipline?: string;
  addedAt: number;
}

const STORAGE_KEY = "cfs-tutor-my-list";

export function useMyList() {
  const [list, setList] = useState<MyListItem[]>([]);
  const [flashId, setFlashId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setList(JSON.parse(stored));
    } catch {}
  }, []);

  const save = useCallback((newList: MyListItem[]) => {
    setList(newList);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
  }, []);

  const add = useCallback(
    (item: Omit<MyListItem, "addedAt">) => {
      save([
        ...list.filter((i) => i.id !== item.id),
        { ...item, addedAt: Date.now() },
      ]);
      setFlashId(item.id);
      setTimeout(() => setFlashId(null), 400);
    },
    [list, save],
  );

  const remove = useCallback(
    (id: string) => {
      save(list.filter((i) => i.id !== id));
      setFlashId(id);
      setTimeout(() => setFlashId(null), 400);
    },
    [list, save],
  );

  const has = useCallback(
    (id: string) => list.some((i) => i.id === id),
    [list],
  );

  return { list, add, remove, has, flashId };
}
