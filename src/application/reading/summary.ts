export type ReadingEventSummaryInput = {
  eventType: string;
  occurredAt: Date;
  createdAt: Date;
};

export function deriveRereadCount(events: readonly Pick<ReadingEventSummaryInput, "eventType">[]): number {
  return events.filter((event) => event.eventType === "reread").length;
}

export function sortReadingEvents<T extends ReadingEventSummaryInput>(events: readonly T[]): T[] {
  return [...events].sort((left, right) => {
    const occurredDifference = right.occurredAt.getTime() - left.occurredAt.getTime();
    return occurredDifference !== 0 ? occurredDifference : right.createdAt.getTime() - left.createdAt.getTime();
  });
}
