import { fireEvent } from "../../common/dom/fire_event";
import type { LocalizeFunc } from "../../common/translations/localize";
import { deepEqual } from "../../common/util/deep-equal";
import { showAlertDialog } from "../../dialogs/generic/show-dialog-box";
import { getWsErrorMessage } from "../../util/ws-error";

interface RelatedItemsFilter<T> extends HTMLElement {
  value?: T;
}

/**
 * Sends the value of a related items filter, like the device or area filter,
 * to its page together with the items that belong to it.
 *
 * Only the newest lookup reaches the page. When a lookup fails, the filter
 * shows the value the page still filters by again, so the two stay in line.
 */
export class RelatedItemsLookup<T> {
  private _requestId = 0;

  private _applied?: { value: T | undefined };

  constructor(private readonly _host: RelatedItemsFilter<T>) {}

  /** Whether the page already filters by this value. */
  public isApplied(value: T | undefined): boolean {
    return this._applied !== undefined && deepEqual(value, this._applied.value);
  }

  /** Drops the running lookup, if any. */
  public cancel(): void {
    this._requestId++;
  }

  /** Sends a value that needs no lookup, dropping the running lookup. */
  public apply(value: T | undefined, items: Set<string> | undefined): void {
    this.cancel();
    this._send(value, items);
  }

  /** Finds the items for a value and sends both, unless a newer lookup started. */
  public async lookUp(
    value: T,
    find: () => Promise<Set<string> | undefined>,
    localize: LocalizeFunc
  ): Promise<void> {
    const requestId = ++this._requestId;
    let items: Set<string> | undefined;
    try {
      items = await find();
    } catch (err: unknown) {
      if (requestId === this._requestId) {
        this._restore(err, localize);
      }
      return;
    }

    // The value changed while this lookup ran
    if (requestId !== this._requestId) {
      return;
    }

    this._send(value, items);
  }

  private _send(value: T | undefined, items: Set<string> | undefined) {
    this._applied = { value };
    fireEvent(this._host, "data-table-filter-changed", { value, items });
  }

  private _restore(err: unknown, localize: LocalizeFunc) {
    // Show the value the page still filters by, which the host doesn't look
    // up again. Before this filter sent anything the page doesn't filter by
    // it at all, so the filter is cleared.
    this._host.value = this._applied?.value;
    showAlertDialog(this._host, {
      title: localize("ui.components.subpage-data-table.related_lookup_failed"),
      text: getWsErrorMessage(err) ?? localize("ui.common.unknown_error"),
    });
  }
}
