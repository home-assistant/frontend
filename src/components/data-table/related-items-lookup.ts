import type { ReactiveController, ReactiveControllerHost } from "lit";
import { fireEvent } from "../../common/dom/fire_event";
import type { LocalizeFunc } from "../../common/translations/localize";
import { deepEqual } from "../../common/util/deep-equal";
import { showAlertDialog } from "../../dialogs/generic/show-dialog-box";
import { getWsErrorMessage } from "../../util/ws-error";

interface RelatedItemsFilter<T>
  extends HTMLElement, Pick<ReactiveControllerHost, "addController"> {
  value?: T;
}

interface SentFilter<T> {
  value: T | undefined;
  items: Set<string> | undefined;
  outdated?: boolean;
}

/**
 * Sends the value of a related items filter, like the device or area filter,
 * to its page together with the items that belong to it.
 *
 * Only the newest lookup reaches the page. When a lookup fails, the filter
 * goes back to the value it last sent and sends it again with its items, so
 * the page gets them back, even if a link changed the page's filter meanwhile.
 * Its host then calls `resend()` instead of looking that value up again.
 */
export class RelatedItemsLookup<T> implements ReactiveController {
  private _requestId = 0;

  private _sent?: SentFilter<T>;

  private _retry?: () => void;

  constructor(private readonly _host: RelatedItemsFilter<T>) {
    _host.addController(this);
  }

  public hostConnected(): void {
    const retry = this._retry;
    this._retry = undefined;
    retry?.();
  }

  /** The value last sent, also when its items are out of date. */
  public get sentValue(): T | undefined {
    return this._sent?.value;
  }

  /** Whether this is the value last sent, so its items are known. */
  public wasSent(value: T | undefined): boolean {
    return (
      this._sent !== undefined &&
      !this._sent.outdated &&
      deepEqual(value, this._sent.value)
    );
  }

  /** Makes going back to the value last sent look up its items again. */
  public markOutdated(): void {
    if (this._sent) {
      this._sent.outdated = true;
    }
  }

  /** Sends the last value and its items again, dropping the running lookup. */
  public resend(): void {
    this._drop();
    if (this._sent) {
      this._fire(this._sent);
    }
  }

  /** Sends a value that needs no lookup, dropping the running lookup. */
  public apply(value: T | undefined, items: Set<string> | undefined): void {
    this._drop();
    this._send(value, items);
  }

  /** Finds the items for a value and sends both, unless a newer lookup started. */
  public async lookUp(
    value: T,
    find: () => Promise<Set<string> | undefined>,
    localize: LocalizeFunc
  ): Promise<void> {
    this._drop();
    const requestId = this._requestId;
    let items: Set<string> | undefined;
    try {
      items = await find();
    } catch (err: unknown) {
      if (requestId !== this._requestId) {
        return;
      }
      if (!this._host.isConnected) {
        // The page was left, which keeps its filter as it is. Try again when
        // the page comes back, so the filter stays in line with it.
        this._retry = () => this.lookUp(value, find, localize);
        return;
      }
      this._restore(err, localize);
      return;
    }

    // The value changed while this lookup ran
    if (requestId !== this._requestId) {
      return;
    }

    this._send(value, items);
  }

  private _drop() {
    this._requestId++;
    this._retry = undefined;
  }

  private _send(value: T | undefined, items: Set<string> | undefined) {
    this._sent = { value, items };
    this._fire(this._sent);
  }

  private _fire({ value, items }: SentFilter<T>, restored?: boolean) {
    fireEvent(
      this._host,
      "data-table-filter-changed",
      restored ? { value, items, restored } : { value, items }
    );
  }

  private _restore(err: unknown, localize: LocalizeFunc) {
    // Before this filter sent anything, the page may still filter by what it
    // stored, so the value stays
    if (this._sent) {
      this._host.value = this._sent.value;
      // The page writes its URL before the dialog adds a history entry, so
      // going back to close the dialog doesn't bring the failed value back.
      // Marked as restored, so the page doesn't store a link's value as the
      // user's. Outdated items are still looked up again by the host.
      this._fire(this._sent, true);
    }
    showAlertDialog(this._host, {
      title: localize("ui.components.subpage-data-table.related_lookup_failed"),
      text: getWsErrorMessage(err) ?? localize("ui.common.unknown_error"),
    });
  }
}
