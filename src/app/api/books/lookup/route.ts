import { NextResponse } from "next/server";
import { OpenLibraryBookMetadataProvider } from "@/infrastructure/metadata/open-library";
import { isValidIsbn, normalizeIsbn } from "@/domain/books/isbn";
import { MetadataProviderError } from "@/application/books/book-metadata";
import { lookupByIsbn } from "@/application/books/lookup-by-isbn";

const provider = new OpenLibraryBookMetadataProvider();

export async function GET(request: Request) {
  const rawIsbn = new URL(request.url).searchParams.get("isbn")?.trim() ?? "";
  if (!isValidIsbn(rawIsbn)) {
    return NextResponse.json(
      { error: "Enter a valid ISBN-10 or ISBN-13." },
      { status: 400 },
    );
  }

  try {
    const book = await lookupByIsbn(normalizeIsbn(rawIsbn), provider);
    if (book === null) {
      return NextResponse.json(
        { error: "No Open Library record was found for this ISBN." },
        { status: 404 },
      );
    }

    return NextResponse.json(book);
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
