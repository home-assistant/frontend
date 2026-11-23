// Find column with < 5 size, else smallest column. A negative size counts as
// 0, so that larger sizes only ever move cards on sooner.
const getColumnIndex = (columnSizes: number[], size: number) => {
  let minIndex = 0;
  for (let i = 0; i < columnSizes.length; i++) {
    if (columnSizes[i] < 5) {
      minIndex = i;
      break;
    }
    if (columnSizes[i] < columnSizes[minIndex]) {
      minIndex = i;
    }
  }

  columnSizes[minIndex] += Math.max(size, 0);

  return minIndex;
};

/**
 * Assign columns in card order, as far as the card sizes are known.
 *
 * @param sizes Card sizes in card order, undefined while not known yet
 * @returns The column of every card up to the first unknown size
 */
export const assignColumns = (
  sizes: (number | undefined)[],
  maxColumns: number
): number[] => {
  const columnSizes: number[] = new Array(maxColumns).fill(0);
  const columns: number[] = [];
  for (const size of sizes) {
    if (size === undefined) {
      break;
    }
    columns.push(getColumnIndex(columnSizes, size));
  }
  return columns;
};

// The first card of every column the cards reach, with unknown sizes
// counted as `unknown`
const firstCards = (
  sizes: (number | undefined)[],
  maxColumns: number,
  unknown: number
): number[] => {
  const columnSizes: number[] = new Array(maxColumns).fill(0);
  const firsts: number[] = [];
  for (let index = 0; index < sizes.length; index++) {
    firsts[getColumnIndex(columnSizes, sizes[index] ?? unknown)] ??= index;
  }
  return firsts;
};

export interface ColumnsDecision {
  /** Number of columns to add */
  count: number;
  /** Columns that keep their share of the width while cards are placed */
  held: number[];
}

/**
 * Decide the columns before any card is added, once their widths can no
 * longer change: when the number of columns is certain and every column gets
 * a shown card, or when all sizes are known. Otherwise a column that is
 * filled or removed later would change the width of the cards already shown.
 *
 * @param sizes Card sizes in card order, undefined while not known yet.
 *   A negative size counts as 0.
 * @param shown Whether each card is shown, in card order
 * @param maxColumns Number of columns that fit, at most the number of cards
 * @returns The columns, or undefined while they depend on unknown sizes
 */
export const decideColumns = (
  sizes: (number | undefined)[],
  shown: boolean[],
  maxColumns: number
): ColumnsDecision | undefined => {
  const columns = assignColumns(sizes, maxColumns);
  const shownColumns = new Set(
    columns.filter((_column, index) => shown[index])
  );
  if (columns.length === sizes.length) {
    const count = columns.length ? Math.max(...columns) + 1 : 0;
    return {
      count,
      held: count > 1 ? [...shownColumns].sort((a, b) => a - b) : [],
    };
  }
  // Cards fill the columns from the left until each reaches size 5, and
  // larger sizes only make them move on sooner. So with unknown sizes counted
  // as 0 and as 5, the cards reach the fewest and the most columns they can,
  // and the first card of each column lies between the two.
  const least = firstCards(sizes, maxColumns, 0);
  const most = firstCards(sizes, maxColumns, 5);
  if (least.length !== most.length) {
    return undefined;
  }
  const count = least.length;
  if (count === 1) {
    return { count, held: [] };
  }
  // A column gets a shown card when one of its known cards is shown, or when
  // every card that can be its first card is shown
  for (let column = 0; column < count; column++) {
    if (
      !shownColumns.has(column) &&
      !shown.slice(most[column], least[column] + 1).every(Boolean)
    ) {
      return undefined;
    }
  }
  return {
    count,
    held: Array.from({ length: count }, (_column, index) => index),
  };
};
