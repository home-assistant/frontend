import { ContextProvider, createContext } from "@lit/context";
import { html, LitElement } from "lit";
import type { PropertyValues } from "lit";
import { customElement, state } from "lit/decorators";
import { afterEach, describe, expect, it } from "vitest";
import {
  consume,
  consumeContext,
  ContextController,
} from "../../../src/common/decorators/consume";
import { transform } from "../../../src/common/decorators/transform";

interface TestValue {
  a: number;
  b: number;
}

const testContext = createContext<TestValue>("test-consume-context");

declare global {
  interface HTMLElementTagNameMap {
    "test-consume-state": TestConsumeState;
    "test-consume-no-state": TestConsumeNoState;
    "test-consume-transform": TestConsumeTransform;
    "test-consume-once": TestConsumeOnce;
    "test-consume-controller": TestConsumeController;
  }
}

// Counts update cycles; one render() runs per update cycle.
class RenderCounter extends LitElement {
  public renderCount = 0;

  protected updated(changed: PropertyValues) {
    super.updated(changed);
    this.renderCount += 1;
  }
}

@customElement("test-consume-state")
class TestConsumeState extends RenderCounter {
  @state()
  @consume({ context: testContext, subscribe: true })
  public value?: TestValue;

  protected render() {
    return html`${this.value?.a}`;
  }
}

@customElement("test-consume-no-state")
class TestConsumeNoState extends RenderCounter {
  @consume({ context: testContext, subscribe: true })
  public value?: TestValue;

  protected render() {
    return html`static`;
  }
}

@customElement("test-consume-transform")
class TestConsumeTransform extends RenderCounter {
  @state()
  @consume({ context: testContext, subscribe: true })
  @transform<TestValue, number>({ transformer: ({ a }) => a })
  private _a?: number;

  public get a() {
    return this._a;
  }

  protected render() {
    return html`${this._a}`;
  }
}

@customElement("test-consume-once")
class TestConsumeOnce extends RenderCounter {
  @state()
  @consume({ context: testContext })
  public value?: TestValue;

  protected render() {
    return html`${this.value?.a}`;
  }
}

class TestController extends ContextController {
  @consumeContext({
    context: testContext,
    subscribe: true,
    transform: ({ a }) => a,
  })
  public a?: number;

  @consumeContext({ context: testContext })
  public once?: TestValue;

  public updates = 0;

  protected contextUpdated() {
    this.updates += 1;
  }
}

class TestTypedController extends ContextController {
  @consumeContext({ context: testContext, transform: ({ a }) => a })
  public a?: number;

  // @ts-expect-error a number cannot be stored in a string field
  @consumeContext({ context: testContext, transform: ({ a }) => a })
  public label?: string;
}

@customElement("test-consume-controller")
class TestConsumeController extends RenderCounter {
  public controller = new TestController(this);

  protected render() {
    return html`static`;
  }
}

let host: HTMLDivElement | undefined;

afterEach(() => {
  host?.remove();
  host = undefined;
});

const mount = async <T extends RenderCounter>(tag: string) => {
  host = document.createElement("div");
  document.body.appendChild(host);
  const provider = new ContextProvider(host, {
    context: testContext,
    initialValue: { a: 1, b: 1 },
  });
  const el = document.createElement(tag) as T;
  host.appendChild(el);
  await el.updateComplete;
  return { el, provider };
};

describe("consume", () => {
  it("rerenders a @state() field when the context value changes", async () => {
    const { el, provider } =
      await mount<TestConsumeState>("test-consume-state");
    expect(el.value).toEqual({ a: 1, b: 1 });
    expect(el.renderCount).toBe(1);

    provider.setValue({ a: 2, b: 1 });
    await el.updateComplete;
    expect(el.value).toEqual({ a: 2, b: 1 });
    expect(el.renderCount).toBe(2);
  });

  it("keeps a field without @state() up to date without rerendering", async () => {
    const { el, provider } = await mount<TestConsumeNoState>(
      "test-consume-no-state"
    );
    expect(el.renderCount).toBe(1);

    provider.setValue({ a: 2, b: 2 });
    await el.updateComplete;
    expect(el.value).toEqual({ a: 2, b: 2 });
    expect(el.renderCount).toBe(1);
  });

  it("only rerenders when the transformed value changes", async () => {
    const { el, provider } = await mount<TestConsumeTransform>(
      "test-consume-transform"
    );
    expect(el.a).toBe(1);
    expect(el.renderCount).toBe(1);

    provider.setValue({ a: 1, b: 2 });
    await el.updateComplete;
    expect(el.renderCount).toBe(1);

    provider.setValue({ a: 3, b: 2 });
    await el.updateComplete;
    expect(el.a).toBe(3);
    expect(el.renderCount).toBe(2);
  });

  it("takes only the first value without subscribe", async () => {
    const { el, provider } = await mount<TestConsumeOnce>("test-consume-once");
    expect(el.value).toEqual({ a: 1, b: 1 });

    provider.setValue({ a: 2, b: 2 });
    await el.updateComplete;
    expect(el.value).toEqual({ a: 1, b: 1 });
    expect(el.renderCount).toBe(1);
  });
});

describe("consumeContext", () => {
  it("stores the transformed value and reports only real changes", async () => {
    const { el, provider } = await mount<TestConsumeController>(
      "test-consume-controller"
    );
    const { controller } = el;
    expect(controller.a).toBe(1);
    const updates = controller.updates;

    provider.setValue({ a: 1, b: 2 });
    expect(controller.updates).toBe(updates);

    provider.setValue({ a: 3, b: 2 });
    expect(controller.a).toBe(3);
    expect(controller.updates).toBe(updates + 1);

    await el.updateComplete;
    expect(el.renderCount).toBe(1);
  });

  it("takes only the first value without subscribe", async () => {
    const { el, provider } = await mount<TestConsumeController>(
      "test-consume-controller"
    );

    provider.setValue({ a: 2, b: 2 });
    expect(el.controller.once).toEqual({ a: 1, b: 1 });
  });

  it("gets the current value when created on a connected host", async () => {
    const { el, provider } = await mount<TestConsumeController>(
      "test-consume-controller"
    );
    provider.setValue({ a: 4, b: 4 });

    const controller = new TestController(el);
    await Promise.resolve();
    expect(controller.a).toBe(4);
    expect(controller.once).toEqual({ a: 4, b: 4 });
    expect(controller.updates).toBe(2);
  });

  it("stores the transformed value in a typed public field", async () => {
    const { el } = await mount<TestConsumeController>(
      "test-consume-controller"
    );

    const controller = new TestTypedController(el);
    await Promise.resolve();
    expect(controller.a).toBe(1);
  });
});
