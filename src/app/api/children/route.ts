import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getActiveHouseholdId } from "@/application/households/active-household";
import { createChildProfile, listChildProfiles } from "@/application/households/child-profiles";
import { DomainInvariantError } from "@/domain/shared/errors";

export async function GET() {
  const householdId = await getActiveHouseholdId();
  const children = await listChildProfiles(householdId);
  return NextResponse.json({ children });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const householdId = await getActiveHouseholdId();
    const child = await createChildProfile({
      ...(typeof body === "object" && body !== null ? body : {}),
      householdId,
    });
    return NextResponse.json({ child }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Choose a valid nickname before adding a reader." }, { status: 400 });
    }
    if (error instanceof DomainInvariantError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
