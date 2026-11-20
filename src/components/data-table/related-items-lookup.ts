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
 * goes back to the value it last sent. Its host then calls `resend()` instead
 * of looking that value up again, so the page gets the matching items back,
 * even if a link changed the page's filter meanwhile.
 */
export class RelatedItemsLookup<T> {
  private _requestId = 0;

  private _sent?: { value: T | undefined; items: Set<string> | undefined };

  constructor(private readonly _host: RelatedItemsFilter<T>) {}

  /** Whether this is the value last sent, so its items are known. */
  public wasSent(value: T | undefined): boolean {
    return this._sent !== undefined && deepEqual(value, this._sent.value);
  }

  /** Sends the last value and its items again, dropping the running lookup. */
  public resend(): void {
    this._requestId++;
    if (this._sent) {
      fireEvent(this._host, "data-table-filter-changed", this._sent);
    }
  }

  /** Sends a value that needs no lookup, dropping the running lookup. */
  public apply(value: T | undefined, items: Set<string> | undefined): void {
    this._requestId++;
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
    this._sent = { value, items };
    fireEvent(this._host, "data-table-filter-changed", this._sent);
  }

  private _restore(err: unknown, localize: LocalizeFunc) {
    // Before this filter sent anything the page doesn't filter by it at all,
    // so the filter is cleared
    this._host.value = this._sent?.value;
    showAlertDialog(this._host, {
      title: localize("ui.components.subpage-data-table.related_lookup_failed"),
      text: getWsErrorMessage(err) ?? localize("ui.common.unknown_error"),
    });
  }
}
