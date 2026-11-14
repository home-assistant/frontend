import { expect, type Page } from "@playwright/test";
import type { MasonryView } from "../../../src/panels/lovelace/views/hui-masonry-view";
import { loadDemo } from "./helpers";

export interface MasonryRebuild {
  /** Size every card reports */
  size: number;
  /** Delay of every card size in ms */
  delay?: number;
  /** Extra delay per card index in ms */
  stagger?: number;
  /** Index of a card whose size takes `slowDelay` ms */
  slow?: number;
  slowDelay?: number;
  /**
   * Place the cards again while the new columns are held, with every size
   * taking 100 ms
   */
  restart?: boolean;
}

export interface MasonryFrame {
  /** Width of every new column, 0 while it has no visible card */
  widths: number[];
  /** Cards in new columns */
  placed: number;
}

/**
 * Make card sizes slow as described, then change the number of masonry
 * columns, so the view places all cards in new columns. Returns one sample
 * per frame.
 */
export async function rebuildMasonryColumns(
  page: Page,
  rebuild: MasonryRebuild
): Promise<{ frames: MasonryFrame[]; requests: number[] }> {
  await page.setViewportSize({ width: 1280, height: 900 });
  await loadDemo(page, "/?demo=arsaboo#/lovelace/0");
  const view = page.locator("hui-masonry-view");
  await expect
    .poll(() =>
      view.evaluate(
        (element: MasonryView) =>
          element.cards.length > 5 &&
          element.cards.every((card) => card.isConnected)
      )
    )
    .toBe(true);

  await view.evaluate((element: MasonryView, options) => {
    const requests: number[] = [];
    element.cards.forEach((card, index) => {
      const delay =
        index === options.slow
          ? options.slowDelay!
          : (options.delay ?? 0) + (options.stagger ?? 0) * index;
      card.getCardSize = () => {
        requests[index] ??= performance.now();
        return new Promise<number>((resolve) => {
          setTimeout(() => resolve(options.size), delay);
        });
      };
    });
    (window as unknown as { masonryRequests: number[] }).masonryRequests =
      requests;
    for (const column of element.shadowRoot!.querySelectorAll(".column")) {
      column.setAttribute("data-old", "");
    }
  }, rebuild);

  const sampling = view.evaluate(async (element: MasonryView, options) => {
    const root = element.shadowRoot!.getElementById("columns")!;
    let started = false;
    let restarted = !options.restart;
    const frames: MasonryFrame[] = [];
    const end = performance.now() + 4000;
    let doneAt: number | undefined;
    // Sample until shortly after all cards are placed
    while (
      performance.now() < end &&
      (doneAt === undefined || performance.now() - doneAt < 300)
    ) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise(requestAnimationFrame);
      started ||= window.innerWidth <= 1000;
      if (!started) {
        continue;
      }
      const fresh = Array.from(root.children).filter(
        (column) => !column.hasAttribute("data-old")
      );
      frames.push({
        widths: fresh.map((column) =>
          column.querySelector(":scope > :not([hidden])")
            ? Math.round(column.getBoundingClientRect().width)
            : 0
        ),
        placed: fresh.reduce(
          (count, column) => count + column.childElementCount,
          0
        ),
      });
      if (
        !restarted &&
        root.querySelector(".column.placing:not([data-old]) > *")
      ) {
        restarted = true;
        for (const card of element.cards) {
          card.getCardSize = () =>
            new Promise<number>((resolve) => {
              setTimeout(() => resolve(options.size), 100);
            });
        }
        element.cards = [...element.cards];
      }
      if (
        doneAt === undefined &&
        frames[frames.length - 1].placed === element.cards.length &&
        !root.querySelector(".placing")
      ) {
        doneAt = performance.now();
      }
    }
    return { frames, done: doneAt !== undefined };
  }, rebuild);
  // A different number of columns places every card again
  await page.setViewportSize({ width: 1000, height: 900 });
  const { frames, done } = await sampling;
  expect(done).toBe(true);
  const { cards, requests } = await view.evaluate((element: MasonryView) => ({
    cards: element.cards.length,
    requests: (window as unknown as { masonryRequests: number[] })
      .masonryRequests,
  }));
  expect(frames[frames.length - 1].placed).toBe(cards);
  expect(requests.filter((time) => time !== undefined)).toHaveLength(cards);
  return { frames, requests };
}

/**
 * From page load, make every card size known after `delay` ms, or right away
 * (size 3) without a delay.
 */
export async function stubMasonryCardSizes(page: Page, delay?: number) {
  await page.addInitScript((ms: number | null) => {
    customElements.whenDefined("hui-card").then(() => {
      const proto = customElements.get("hui-card")!.prototype;
      const getCardSize = proto.getCardSize;
      proto.getCardSize = function () {
        if (ms === null) {
          return 3;
        }
        const size = getCardSize.call(this);
        return new Promise((resolve) => {
          setTimeout(() => resolve(size), ms);
        });
      };
    });
  }, delay ?? null);
}

/**
 * From page load, record how many cards the first animation frame that shows
 * masonry cards has. Read it with `firstMasonryFrameCards`.
 */
export async function recordFirstMasonryFrame(page: Page) {
  await page.addInitScript(() => {
    const findView = (root: Document | ShadowRoot): Element | null => {
      for (const element of root.querySelectorAll("*")) {
        if (element.localName === "hui-masonry-view") {
          return element;
        }
        const found = element.shadowRoot && findView(element.shadowRoot);
        if (found) {
          return found;
        }
      }
      return null;
    };
    let view: Element | null = null;
    const sample = () => {
      view ??= findView(document);
      const placed =
        view?.shadowRoot?.querySelectorAll(".column > :not([hidden])").length ??
        0;
      if (placed) {
        (window as unknown as { masonryFirstFrame: number }).masonryFirstFrame =
          placed;
        return;
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

/** Number of cards in the first animation frame that shows masonry cards. */
export async function firstMasonryFrameCards(page: Page) {
  await page.waitForFunction(
    () =>
      (window as unknown as { masonryFirstFrame?: number })
        .masonryFirstFrame !== undefined
  );
  return page.evaluate(
    () => (window as unknown as { masonryFirstFrame: number }).masonryFirstFrame
  );
}

/** A column that shows a card has its final width in every frame. */
export function expectStableColumnWidths(frames: MasonryFrame[]) {
  const final = frames[frames.length - 1].widths;
  expect(final.filter((width) => width > 0).length).toBeGreaterThan(0);
  for (const { widths } of frames) {
    widths.forEach((width, column) => {
      if (width > 0) {
        expect(Math.abs(width - final[column])).toBeLessThanOrEqual(1);
      }
    });
  }
}
