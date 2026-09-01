/**
 * Generic mapper from { id, desc } → { [id]: "asc" | "desc" }
 */
export function mapSortingToRepo<TIds extends readonly [string, ...string[]]>(
  sorting: { id: TIds[number]; desc: boolean },
  allowedIds: TIds,
): Partial<Record<TIds[number], "asc" | "desc">> {
  if (!allowedIds.includes(sorting.id)) {
    return {};
  }

  return {
    [sorting.id]: sorting.desc ? "desc" : "asc",
  } as Partial<Record<TIds[number], "asc" | "desc">>;
}
