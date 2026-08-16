import { NextResponse } from "next/server";
import { getActiveHouseholdId } from "@/application/households/active-household";
import { listHouseholdReadingHistory } from "@/application/reading/reading-history";

export async function GET() {
  const householdId = await getActiveHouseholdId();
  const items = await listHouseholdReadingHistory(householdId);
  return NextResponse.json({ items });
}
