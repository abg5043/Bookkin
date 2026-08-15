import { NextResponse } from "next/server";
import { z } from "zod";
import { type ShelfStatus, listFamilyShelf, saveToFamilyShelf, shelfStatuses } from "@/application/family-books/family-shelf";
import { getActiveHouseholdId } from "@/application/households/active-household";
import { isValidIsbn, normalizeIsbn } from "@/domain/books/isbn";
import { MetadataProviderError } from "@/application/books/book-metadata";
import { OpenLibraryBookMetadataProvider } from "@/infrastructure/metadata/open-library";
import { lookupByIsbn } from "@/application/books/lookup-by-isbn";

const provider = new OpenLibraryBookMetadataProvider();
const shelfStatusSchema = z.enum(shelfStatuses);
const saveRequestSchema = z.discriminatedUnion("selection", [
  z.object({
    selection: z.literal("isbn"),
    isbn: z.string().trim(),
    shelfStatus: shelfStatusSchema,
  }),
  z.object({
    selection: z.literal("work"),
    workRecordId: z.string().trim().min(1).max(200),
    shelfStatus: shelfStatusSchema,
  }),
  z.object({
    selection: z.literal("edition"),
    editionRecordId: z.string().trim().min(1).max(200),
    shelfStatus: shelfStatusSchema,
  }),
]);

async function resolveSelection(
  body: z.infer<typeof saveRequestSchema>,
) {
  if (body.selection === "isbn") {
    return isValidIsbn(body.isbn) ? lookupByIsbn(normalizeIsbn(body.isbn), provider) : null;
  }

  if (body.selection === "work") {
    return provider.lookupWorkByRecordId(body.workRecordId);
  }

  return provider.lookupEditionByRecordId(body.editionRecordId);
}

function invalidSaveResponse() {
  return NextResponse.json(
    { error: "Choose a verified ISBN, work, or edition and select one shelf status." },
    { status: 400 },
  );
}

export async function GET() {
  const householdId = await getActiveHouseholdId();
  const items = await listFamilyShelf(householdId);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const parsedBody = saveRequestSchema.safeParse(await request.json());
  if (!parsedBody.success) {
    return invalidSaveResponse();
  }

  try {
    const metadata = await resolveSelection(parsedBody.data);
    if (metadata === null) {
      return NextResponse.json(
        { error: "This record is no longer available from Open Library. Nothing was saved." },
        { status: 404 },
      );
    }

    const householdId = await getActiveHouseholdId();
    const result = await saveToFamilyShelf(
      householdId,
      metadata,
      parsedBody.data.shelfStatus as ShelfStatus,
      parsedBody.data.selection === "isbn" ? "manual_isbn" : "search",
    );
    return NextResponse.json(result, { status: result.wasAlreadyOnShelf ? 200 : 201 });
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
