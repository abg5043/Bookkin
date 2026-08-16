import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { getActiveHouseholdId } from "@/application/households/active-household";
import { correctReadingEvent } from "@/application/reading/corrections";
import { DomainInvariantError } from "@/domain/shared/errors";

const undoRequestSchema = z.object({
  clientMutationId: z.string().trim().min(1).max(120),
  declaredAt: z.coerce.date(),
}).strict();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  try {
    const input = undoRequestSchema.parse(await request.json());
    const householdId = await getActiveHouseholdId();
    const amendment = await correctReadingEvent({
      householdId,
      targetId: eventId,
      kind: "retract",
      declaredAt: input.declaredAt,
      reporterType: "caregiver",
      reasonCode: "quick_log_undo",
      clientMutationId: input.clientMutationId,
    });
    return NextResponse.json({ amendment }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return NextResponse.json({ error: "That undo request was not valid." }, { status: 400 });
    }
    if (error instanceof DomainInvariantError) {
      return NextResponse.json({ error: "That reading moment is no longer available to undo." }, { status: 409 });
    }
    throw error;
  }
}
