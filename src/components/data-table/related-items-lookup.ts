import type { ReactiveController, ReactiveControllerHost } from "lit";
import { fireEvent } from "../../common/dom/fire_event";
import type { LocalizeFunc } from "../../common/translations/localize";
import { currentPath } from "../../common/url/current-path";
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

const trimSlash = (path: string) =>
  path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;

// A router can send a path without a page on to its default page
const isSamePage = (current: string, path: string) =>
  trimSlash(current) === trimSlash(path) ||
  current.startsWith(`${trimSlash(path)}/`);

/**
 * Sends the value of a related items filter, like the device or area filter,
 * to its page together with the items that belong to it.
 *
 * Only the newest lookup reaches the page. When a lookup fails, the filter
 * goes back to the value it last sent and sends it again with its items, so
 * the page gets them back, even if a link changed the page's filter meanwhile.
 * Its host then calls `resend()` instead of looking that value up again.
 *
 * A lookup that fails after its page was left is tried again once the page is
 * shown again, so the filter stays in line with it.
 */
export class RelatedItemsLookup<T> implements ReactiveController {
  private _requestId = 0;

  private _sent?: SentFilter<T>;

  private _retry?: { path: string; lookUp: () => void };

  // Set after a failed lookup sent the value last sent again
  private _restored = false;

  constructor(private readonly _host: RelatedItemsFilter<T>) {
    _host.addController(this);
  }

  public hostConnected(): void {
    this._retryOnPage();
  }

  // A page can be shown again without being disconnected, like when the user
  // comes back before the next page loaded
  public hostUpdated(): void {
    this._retryOnPage();
  }

  /** The value last sent, also when its items are out of date. */
  public get sentValue(): T | undefined {
    return this._sent?.value;
  }

  /**
   * Whether this is the value last sent, so its items are known. After a
   * failed lookup, outdated items are kept until the value changes again, so
   * the rollback doesn't start another lookup that can fail too.
   */
  public wasSent(value: T | undefined): boolean {
    return (
      this._sent !== undefined &&
      (!this._sent.outdated || this._restored) &&
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
    // A failed lookup already sent them
    const restored = this._restored;
    this._drop();
    if (this._sent && !restored) {
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
    const path = currentPath();
    let items: Set<string> | undefined;
    try {
      items = await find();
    } catch (err: unknown) {
      if (requestId !== this._requestId) {
        return;
      }
      if (!this._isOnPage(path)) {
        // The page was left, which keeps its filter as it is. The router can
        // keep it connected while the next page loads, so check the path too.
        this._retry = {
          path,
          lookUp: () => this.lookUp(value, find, localize),
        };
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
    this._restored = false;
  }

  private _isOnPage(path: string): boolean {
    return this._host.isConnected && isSamePage(currentPath(), path);
  }

  private _retryOnPage() {
    if (this._retry && this._isOnPage(this._retry.path)) {
      this._retry.lookUp();
    }
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
      // user's.
      this._fire(this._sent, true);
      this._restored = true;
    }
    showAlertDialog(this._host, {
      title: localize("ui.components.subpage-data-table.related_lookup_failed"),
      text: getWsErrorMessage(err) ?? localize("ui.common.unknown_error"),
    });
  }
}
