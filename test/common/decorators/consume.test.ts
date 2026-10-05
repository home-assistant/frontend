import { ContextProvider, createContext } from "@lit/context";
import { html, LitElement } from "lit";
import type { PropertyValues } from "lit";
import { customElement, state } from "lit/decorators";
import { afterEach, describe, expect, it } from "vitest";
import { consume } from "../../../src/common/decorators/consume";
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
