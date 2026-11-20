import type { ReactiveController } from "lit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RelatedItemsLookup } from "../../../src/components/data-table/related-items-lookup";
import type { LocalizeFunc } from "../../../src/common/translations/localize";
import type { DataTableFilter } from "../../../src/data/data_table_filters";
import { showAlertDialog } from "../../../src/dialogs/generic/show-dialog-box";

vi.mock("../../../src/dialogs/generic/show-dialog-box", () => ({
  showAlertDialog: vi.fn(),
}));

const localize = ((key: string) => key) as LocalizeFunc;

const deferred = () => {
  let resolve!: (items: Set<string>) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<Set<string>>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const filter = () => {
  const controllers: ReactiveController[] = [];
  const host = Object.assign(document.createElement("div"), {
    value: undefined as string[] | undefined,
    addController: (controller: ReactiveController) => {
      controllers.push(controller);
    },
  });
  document.body.append(host);
  const sent: DataTableFilter[] = [];
  host.addEventListener("data-table-filter-changed", (ev) =>
    sent.push((ev as CustomEvent<DataTableFilter>).detail)
  );
  const lookup = new RelatedItemsLookup<string[]>(host);
  // Like a page that is left and opened again
  const reconnect = () => {
    document.body.append(host);
    controllers.forEach((controller) => controller.hostConnected?.());
  };
  return { host, sent, lookup, reconnect };
};

afterEach(() => {
  vi.mocked(showAlertDialog).mockClear();
  document.body.replaceChildren();
});

describe("RelatedItemsLookup", () => {
  it("sends only the newest lookup to the page", async () => {
    const { sent, lookup } = filter();
    const slow = deferred();
    const fast = deferred();

    const first = lookup.lookUp(["kitchen"], () => slow.promise, localize);
    const second = lookup.lookUp(["hall"], () => fast.promise, localize);
    fast.resolve(new Set(["automation.hall"]));
    slow.resolve(new Set(["automation.kitchen"]));
    await Promise.all([first, second]);

    expect(sent).toEqual([
      { value: ["hall"], items: new Set(["automation.hall"]) },
    ]);
    expect(lookup.wasSent(["hall"])).toBe(true);
  });

  it("goes back to the value last sent when a lookup fails", async () => {
    const { host, sent, lookup } = filter();
    await lookup.lookUp(
      ["kitchen"],
      async () => new Set(["automation.kitchen"]),
      localize
    );

    host.value = ["kitchen", "hall"];
    await lookup.lookUp(
      host.value,
      () => Promise.reject({ code: "unknown_error", message: "Lookup failed" }),
      localize
    );

    expect(host.value).toEqual(["kitchen"]);
    expect(lookup.wasSent(host.value)).toBe(true);
    expect(sent).toHaveLength(1);
    expect(showAlertDialog).toHaveBeenCalledWith(host, {
      title: "ui.components.subpage-data-table.related_lookup_failed",
      text: "Lookup failed",
    });

    // A link may have changed the page's filter meanwhile, so the host sends
    // the restored value and its items again
    lookup.resend();
    expect(sent).toEqual([
      { value: ["kitchen"], items: new Set(["automation.kitchen"]) },
      { value: ["kitchen"], items: new Set(["automation.kitchen"]) },
    ]);
  });

  it("sends the items again when the value goes back while a lookup runs", async () => {
    const { sent, lookup } = filter();
    await lookup.lookUp(
      ["kitchen"],
      async () => new Set(["automation.kitchen"]),
      localize
    );

    // Like a link selecting another device, then one going back
    const running = deferred();
    const lookUp = lookup.lookUp(["hall"], () => running.promise, localize);
    expect(lookup.wasSent(["kitchen"])).toBe(true);
    lookup.resend();
    running.resolve(new Set(["automation.hall"]));
    await lookUp;

    expect(sent).toEqual([
      { value: ["kitchen"], items: new Set(["automation.kitchen"]) },
      { value: ["kitchen"], items: new Set(["automation.kitchen"]) },
    ]);
  });

  it("keeps the value when its first lookup fails", async () => {
    const { host, sent, lookup } = filter();
    host.value = ["kitchen"];

    await lookup.lookUp(
      host.value,
      () => Promise.reject(new Error("Connection lost")),
      localize
    );

    // The page may still filter by what it stored
    expect(host.value).toEqual(["kitchen"]);
    expect(lookup.wasSent(host.value)).toBe(false);
    expect(sent).toEqual([]);
    expect(showAlertDialog).toHaveBeenCalledOnce();
  });

  it("tries again when a page that was left comes back", async () => {
    const { host, sent, lookup, reconnect } = filter();
    await lookup.lookUp(
      ["kitchen"],
      async () => new Set(["automation.kitchen"]),
      localize
    );

    host.value = ["hall"];
    const find = vi
      .fn<() => Promise<Set<string>>>()
      .mockRejectedValueOnce(new Error("Connection lost"))
      .mockResolvedValueOnce(new Set(["automation.hall"]));
    const lookUp = lookup.lookUp(host.value, find, localize);
    host.remove();
    await lookUp;

    expect(host.value).toEqual(["hall"]);
    expect(showAlertDialog).not.toHaveBeenCalled();

    reconnect();
    await vi.waitFor(() => expect(sent).toHaveLength(2));
    expect(sent[1]).toEqual({
      value: ["hall"],
      items: new Set(["automation.hall"]),
    });
    expect(find).toHaveBeenCalledTimes(2);
  });

  it("looks up the value last sent again once its items are outdated", async () => {
    const { lookup } = filter();
    await lookup.lookUp(
      ["kitchen"],
      async () => new Set(["automation.kitchen"]),
      localize
    );

    lookup.markOutdated();

    expect(lookup.wasSent(["kitchen"])).toBe(false);
    expect(lookup.sentValue).toEqual(["kitchen"]);
  });

  it("ignores a failed lookup that a newer value replaced", async () => {
    const { host, sent, lookup } = filter();
    const failing = deferred();
    host.value = ["kitchen"];

    const lookUp = lookup.lookUp(host.value, () => failing.promise, localize);
    host.value = [];
    lookup.apply([], undefined);
    failing.reject(new Error("Connection lost"));
    await lookUp;

    expect(host.value).toEqual([]);
    expect(sent).toEqual([{ value: [], items: undefined }]);
    expect(showAlertDialog).not.toHaveBeenCalled();
  });
});
