import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getActiveHouseholdId } from "@/application/households/active-household";
import { createInterestPhase } from "@/application/interests/interest-phases";
import { matchTopicCode } from "@/domain/interests/topic-codes";
import { DomainInvariantError } from "@/domain/shared/errors";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ childId: string }> },
) {
  const { childId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Add a topic before saving." }, { status: 400 });
  }

  try {
    const householdId = await getActiveHouseholdId();
    const interest = await createInterestPhase({
      ...(typeof body === "object" && body !== null ? body : {}),
      householdId,
      childId,
    });
    const matchedTopicCode = matchTopicCode(interest.label);
    return NextResponse.json({ interest, matchedTopicCode }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Add a topic before saving." }, { status: 400 });
    }
    if (error instanceof DomainInvariantError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
