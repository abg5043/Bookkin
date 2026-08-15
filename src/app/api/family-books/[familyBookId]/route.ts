import { NextResponse } from "next/server";
import { getActiveHouseholdId } from "@/application/households/active-household";
import { getFamilyBookHistory } from "@/application/reading/reading-history";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ familyBookId: string }> },
) {
  const { familyBookId } = await params;
  const householdId = await getActiveHouseholdId();
  const history = await getFamilyBookHistory(householdId, familyBookId);

  if (history === null) {
    return NextResponse.json({ error: "This book is not on your family shelf." }, { status: 404 });
  }

  return NextResponse.json(history);
}
