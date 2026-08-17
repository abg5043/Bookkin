import { NextResponse } from "next/server";
import { getActiveHouseholdId } from "@/application/households/active-household";
import { getReadingProfile } from "@/application/households/reading-profile";
import { DomainInvariantError } from "@/domain/shared/errors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ childId: string }> },
) {
  const { childId } = await params;
  try {
    const householdId = await getActiveHouseholdId();
    const profile = await getReadingProfile({ householdId, childId });
    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof DomainInvariantError) {
      return NextResponse.json({ error: "This reader was not found." }, { status: 404 });
    }
    throw error;
  }
}
