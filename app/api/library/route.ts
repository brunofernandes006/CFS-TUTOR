import { NextRequest, NextResponse } from "next/server";
import {
  searchLibrary,
  getDocumentTypes,
  getDocumentCategories,
} from "@/lib/services/libraryService";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Meta-queries
    if (searchParams.get("meta") === "types") {
      return NextResponse.json(getDocumentTypes());
    }
    if (searchParams.get("meta") === "categories") {
      return NextResponse.json(getDocumentCategories());
    }

    const result = searchLibrary({
      search: searchParams.get("search") ?? undefined,
      tipo: searchParams.get("tipo") ?? undefined,
      categoria: searchParams.get("categoria") ?? undefined,
      cfs26_only: searchParams.get("cfs26") === "1",
      page: parseInt(searchParams.get("page") ?? "1", 10),
      per_page: parseInt(searchParams.get("per_page") ?? "20", 10),
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[API /library]", err);
    return NextResponse.json({ error: "Erro ao buscar biblioteca" }, { status: 500 });
  }
}
