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
  const host = Object.assign(document.createElement("div"), {
    value: undefined as string[] | undefined,
  });
  const sent: DataTableFilter[] = [];
  host.addEventListener("data-table-filter-changed", (ev) =>
    sent.push((ev as CustomEvent<DataTableFilter>).detail)
  );
  return { host, sent, lookup: new RelatedItemsLookup<string[]>(host) };
};

afterEach(() => {
  vi.mocked(showAlertDialog).mockClear();
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
    expect(lookup.isApplied(["hall"])).toBe(true);
  });

  it("shows the value the page still filters by when a lookup fails", async () => {
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
    expect(lookup.isApplied(host.value)).toBe(true);
    expect(sent).toHaveLength(1);
    expect(showAlertDialog).toHaveBeenCalledWith(host, {
      title: "ui.components.subpage-data-table.related_lookup_failed",
      text: "Lookup failed",
    });
  });

  it("clears the filter when its first lookup fails", async () => {
    const { host, sent, lookup } = filter();
    host.value = ["kitchen"];

    await lookup.lookUp(
      host.value,
      () => Promise.reject(new Error("Connection lost")),
      localize
    );

    expect(host.value).toBeUndefined();
    expect(lookup.isApplied(undefined)).toBe(false);
    expect(sent).toEqual([]);
    expect(showAlertDialog).toHaveBeenCalledOnce();
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

  it("drops a running lookup when cancelled", async () => {
    const { sent, lookup } = filter();
    const running = deferred();

    const lookUp = lookup.lookUp(["kitchen"], () => running.promise, localize);
    lookup.cancel();
    running.resolve(new Set(["automation.kitchen"]));
    await lookUp;

    expect(sent).toEqual([]);
  });
});
