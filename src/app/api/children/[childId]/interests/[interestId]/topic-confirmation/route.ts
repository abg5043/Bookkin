import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getActiveHouseholdId } from "@/application/households/active-household";
import { createInterestTopicConfirmation } from "@/application/interests/topic-confirmations";
import { DomainInvariantError } from "@/domain/shared/errors";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ childId: string; interestId: string }> },
) {
  const { childId, interestId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 400 });
  }

  try {
    const householdId = await getActiveHouseholdId();
    const confirmation = await createInterestTopicConfirmation({
      ...(typeof body === "object" && body !== null ? body : {}),
      householdId,
      childId,
      interestPhaseId: interestId,
    });
    return NextResponse.json({ confirmation }, { status: 201 });
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
