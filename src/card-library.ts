export type CardLibraryRecord = Record<string, unknown> & {
  revisionId: string;
  libraryOrder?: number;
  libraryHidden?: boolean;
};

function storedOrder(value: CardLibraryRecord): number {
  return Number.isFinite(value.libraryOrder) ? value.libraryOrder as number : Number.MAX_SAFE_INTEGER;
}

export function orderVisibleCards<T extends CardLibraryRecord>(records: readonly T[]): T[] {
  return records
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => record.libraryHidden !== true)
    .sort((left, right) => storedOrder(left.record) - storedOrder(right.record) || left.index - right.index)
    .map(({ record }) => record);
}

export function reorderVisibleCards<T extends CardLibraryRecord>(records: readonly T[], revisionIds: readonly string[]): T[] {
  const visible = orderVisibleCards(records);
  const expected = new Set(visible.map((record) => record.revisionId));
  const requested = new Set(revisionIds);
  if (requested.size !== revisionIds.length || requested.size !== expected.size || revisionIds.some((revisionId) => !expected.has(revisionId))) {
    throw new Error("必须提交当前可见卡库的完整卡片顺序");
  }
  const order = new Map(revisionIds.map((revisionId, index) => [revisionId, index]));
  return records.map((record) => record.libraryHidden === true ? record : { ...record, libraryOrder: order.get(record.revisionId) } as T);
}

export function hideCardFromLibrary<T extends CardLibraryRecord>(record: T): T {
  return { ...record, libraryHidden: true };
}

export function preserveCardLibraryMetadata<T extends CardLibraryRecord>(fresh: T, stored: CardLibraryRecord): T {
  return {
    ...fresh,
    ...(Number.isFinite(stored.libraryOrder) ? { libraryOrder: stored.libraryOrder } : {}),
    ...(stored.libraryHidden === true ? { libraryHidden: true } : {}),
  };
}

export function restoreCardToLibrary<T extends CardLibraryRecord>(fresh: T, stored?: CardLibraryRecord): T {
  return {
    ...fresh,
    ...(stored !== undefined && Number.isFinite(stored.libraryOrder) ? { libraryOrder: stored.libraryOrder } : {}),
    libraryHidden: false,
  };
}
