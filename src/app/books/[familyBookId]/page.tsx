import { ReadingHistory } from "@/components/reading-history";

export default async function BookHistoryPage({
  params,
}: {
  params: Promise<{ familyBookId: string }>;
}) {
  const { familyBookId } = await params;
  return <ReadingHistory familyBookId={familyBookId} />;
}
