import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getActiveHouseholdId } from "@/application/households/active-household";
import { appendQuickReadingLog } from "@/application/reading/reading-history";
import { DomainInvariantError } from "@/domain/shared/errors";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ familyBookId: string }> },
) {
  const { familyBookId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Choose a reading event before saving." }, { status: 400 });
  }

  try {
    const householdId = await getActiveHouseholdId();
    const event = await appendQuickReadingLog(householdId, familyBookId, body);
    if (event === null) {
      return NextResponse.json({ error: "This book is not on your family shelf." }, { status: 404 });
    }

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Choose valid reading details before saving." }, { status: 400 });
    }
    if (error instanceof DomainInvariantError) {
      return NextResponse.json({ error: "That reading update conflicts with an earlier save." }, { status: 409 });
    }
    throw error;
  }
}
