import Fuse, {
  type Expression,
  type FuseIndex,
  type FuseResult,
  type FuseSearchOptions,
  type IFuseOptions,
} from "fuse.js";

export interface FuseKey {
  getFn: null;
  id: string;
  path: string[];
  src: string;
  weight: number;
}

const DEFAULT_OPTIONS: IFuseOptions<any> = {
  ignoreDiacritics: true,
  isCaseSensitive: false,
  threshold: 0.3,
  minMatchCharLength: 2,
};

export class HaFuse<T> extends Fuse<T> {
  public constructor(
    list: readonly T[],
    options?: IFuseOptions<T>,
    index?: FuseIndex<T>
  ) {
    const mergedOptions = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
    super(list, mergedOptions, index);
  }

  /**
   * Performs a multi-term search across the indexed data.
   * Splits the search string into individual terms and performs an AND operation between terms,
   * where each term is searched across all indexed keys with an OR operation. words with less than
   * 2 characters are ignored. If no valid terms are found, the search will return null.
   *
   * @param search - The search string to split into terms. Terms are space-separated.
   * @param options - Optional Fuse.js search options to customize the search behavior.
   * @typeParam R - The type of the result items. Defaults to T (the type of the indexed items).
   * @returns An array of FuseResult objects containing matched items and their matching information.
   *          If no valid terms are found (after filtering by minimum length), returns all items with empty matches.
   */
  public multiTermsSearch(
    search: string,
    options?: FuseSearchOptions
  ): FuseResult<T>[] | null {
    const terms = search.toLowerCase().split(" ");

    // @ts-expect-error options is not part of the Fuse type
    const { minMatchCharLength } = this.options as IFuseOptions<T>;

    const filteredTerms = minMatchCharLength
      ? terms.filter((term) => term.length >= minMatchCharLength)
      : terms;

    if (filteredTerms.length === 0) {
      // If no valid terms are found, return null to indicate no search was performed
      return null;
    }

    const index = this.getIndex().toJSON();
    const keys = index.keys as unknown as FuseKey[]; // Fuse type for key is not correct

    const expression: Expression = {
      $and: filteredTerms.map((term) => ({
        $or: keys.map((key) => ({ $path: key.path, $val: term })),
      })),
    };

    return this.search(expression, options);
  }
}
