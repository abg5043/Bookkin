import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getActiveHouseholdId } from "@/application/households/active-household";
import { saveChildProfileSetup } from "@/application/households/child-profiles";
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
    return NextResponse.json({ error: "Choose an age range and at least one reading relationship." }, { status: 400 });
  }

  try {
    const householdId = await getActiveHouseholdId();
    const child = await saveChildProfileSetup({
      ...(typeof body === "object" && body !== null ? body : {}),
      householdId,
      childId,
    });
    return NextResponse.json({ child });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Choose an age range and at least one reading relationship." }, { status: 400 });
    }
    if (error instanceof DomainInvariantError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
