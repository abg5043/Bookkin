import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getActiveHouseholdId } from "@/application/households/active-household";
import { endInterestPhase } from "@/application/interests/interest-phases";
import { DomainInvariantError } from "@/domain/shared/errors";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ interestId: string }> },
) {
  const { interestId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 400 });
  }

  try {
    const householdId = await getActiveHouseholdId();
    const end = await endInterestPhase({
      ...(typeof body === "object" && body !== null ? body : {}),
      householdId,
      interestPhaseId: interestId,
    });
    return NextResponse.json({ end });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 400 });
    }
    if (error instanceof DomainInvariantError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
