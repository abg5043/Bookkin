import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { MetadataProviderError } from "@/application/books/book-metadata";
import { getActiveHouseholdId } from "@/application/households/active-household";
import { rememberBookForChild } from "@/application/preferences/remember-book";
import { DomainInvariantError } from "@/domain/shared/errors";
import { OpenLibraryBookMetadataProvider } from "@/infrastructure/metadata/open-library";

const provider = new OpenLibraryBookMetadataProvider();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ childId: string }> },
) {
  const { childId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Choose a book and say who it worked for." }, { status: 400 });
  }

  try {
    const householdId = await getActiveHouseholdId();
    const observation = await rememberBookForChild(
      {
        ...(typeof body === "object" && body !== null ? body : {}),
        householdId,
        childId,
      },
      provider,
    );
    return NextResponse.json({ observation }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Choose a book and say who it worked for." }, { status: 400 });
    }
    if (error instanceof MetadataProviderError) {
      return NextResponse.json(
        { error: "We could not reach Open Library. Nothing was saved." },
        { status: 502 },
      );
    }
    if (error instanceof DomainInvariantError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
