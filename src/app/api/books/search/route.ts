import { NextResponse } from "next/server";
import { MetadataProviderError } from "@/application/books/book-metadata";
import { OpenLibraryBookMetadataProvider } from "@/infrastructure/metadata/open-library";

const provider = new OpenLibraryBookMetadataProvider();

export async function GET(request: Request) {
  const searchParameters = new URL(request.url).searchParams;
  const query = searchParameters.get("query")?.trim() ?? "";
  const field = searchParameters.get("field");

  if (query.length < 2 || (field !== "title" && field !== "author")) {
    return NextResponse.json(
      { error: "Enter at least two characters and choose title or author." },
      { status: 400 },
    );
  }

  try {
    const results = await provider.search(query, field);
    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof MetadataProviderError) {
      return NextResponse.json(
        { error: "We could not reach Open Library. Nothing was saved." },
        { status: 502 },
      );
    }

    throw error;
  }
}
