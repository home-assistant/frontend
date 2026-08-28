import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import "../../../src/components/input/ha-input";
import "../../../src/components/input/ha-input-search";
import type { HaInput } from "../../../src/components/input/ha-input";

const activeResizeObservers = new Set<TrackingResizeObserver>();

const internalsProto = window.ElementInternals.prototype;
const originalSetValidity = Object.getOwnPropertyDescriptor(
  internalsProto,
  "setValidity"
);
const originalSetFormValue = Object.getOwnPropertyDescriptor(
  internalsProto,
  "setFormValue"
);
const originalValidity = Object.getOwnPropertyDescriptor(
  internalsProto,
  "validity"
);

const restoreProperty = (
  property: "setValidity" | "setFormValue" | "validity",
  descriptor: PropertyDescriptor | undefined
): void => {
  if (descriptor) {
    Object.defineProperty(internalsProto, property, descriptor);
  } else {
    delete (internalsProto as unknown as Record<string, unknown>)[property];
  }
};

beforeAll(() => {
  Object.defineProperty(internalsProto, "setValidity", {
    value: vi.fn(),
    configurable: true,
    writable: true,
  });
  Object.defineProperty(internalsProto, "setFormValue", {
    value: vi.fn(),
    configurable: true,
    writable: true,
  });
  Object.defineProperty(internalsProto, "validity", {
    get: () => ({ valid: true }),
    configurable: true,
  });
});

afterAll(() => {
  restoreProperty("setValidity", originalSetValidity);
  restoreProperty("setFormValue", originalSetFormValue);
  restoreProperty("validity", originalValidity);
});

class TrackingResizeObserver {
  private readonly _targets = new Set<Element>();

  public observe(target: Element): void {
    this._targets.add(target);
    activeResizeObservers.add(this);
  }

  public unobserve(target: Element): void {
    this._targets.delete(target);

    if (this._targets.size === 0) {
      activeResizeObservers.delete(this);
    }
  }

  public disconnect(): void {
    this._targets.clear();
    activeResizeObservers.delete(this);
  }
}

describe("ha-input start slot tracking", () => {
  let inputs: HaInput[] = [];

  const mountInput = async (
    tag: "ha-input" | "ha-input-search" = "ha-input",
    setup?: (input: HaInput) => void
  ): Promise<HaInput> => {
    const input = document.createElement(tag) as HaInput;
    setup?.(input);
    document.body.append(input);
    inputs.push(input);
    await input.updateComplete;
    return input;
  };

  const createStartContent = (text = "start"): HTMLElement => {
    const content = document.createElement("span");
    content.slot = "start";
    content.textContent = text;
    return content;
  };

  const expectActiveObservers = async (count: number): Promise<void> => {
    await vi.waitFor(() => {
      expect(activeResizeObservers.size).toBe(count);
    });
  };

  beforeEach(() => {
    activeResizeObservers.clear();
    vi.stubGlobal("ResizeObserver", TrackingResizeObserver);
  });

  afterEach(async () => {
    inputs.forEach((input) => input.remove());
    inputs = [];

    await expectActiveObservers(0);

    activeResizeObservers.clear();
    vi.unstubAllGlobals();
  });

  it("does not observe an empty start slot", async () => {
    await mountInput();

    await expectActiveObservers(0);
  });

  it("observes fallback start content", async () => {
    await mountInput("ha-input-search");

    await expectActiveObservers(1);
  });

  it("starts and stops tracking when start content changes", async () => {
    const input = await mountInput();
    const content = createStartContent();

    input.append(content);
    await expectActiveObservers(1);

    content.remove();
    await expectActiveObservers(0);
  });

  it("stops and resumes tracking when insetLabel changes", async () => {
    const input = await mountInput("ha-input-search");

    await expectActiveObservers(1);

    input.insetLabel = true;
    await input.updateComplete;
    await expectActiveObservers(0);

    input.insetLabel = false;
    await input.updateComplete;
    await expectActiveObservers(1);
  });

  it("cleans up and restores tracking across reconnects", async () => {
    const input = await mountInput("ha-input-search");

    await expectActiveObservers(1);

    input.remove();
    await expectActiveObservers(0);

    document.body.append(input);
    await expectActiveObservers(1);
  });

  it("settles on the final state after rapid start content changes", async () => {
    const input = await mountInput();

    const first = createStartContent("first");
    input.append(first);
    first.remove();

    const second = createStartContent("second");
    input.append(second);

    await expectActiveObservers(1);

    second.remove();

    await expectActiveObservers(0);
  });

  it("tracks initial external start content without leaking observers", async () => {
    await mountInput("ha-input", (input) => {
      input.append(createStartContent());
    });

    await expectActiveObservers(1);
  });
});
