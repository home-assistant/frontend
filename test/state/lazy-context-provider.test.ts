import { ContextEvent, createContext } from "@lit/context";
import type { Connection, UnsubscribeFunc } from "home-assistant-js-websocket";
import type { ReactiveElement } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LazyContextProvider } from "../../src/state/lazy-context-provider";

const testContext = createContext<string[]>("lazy-test");

const tick = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

describe("LazyContextProvider", () => {
  let host: HTMLElement;
  const connection = {} as Connection;

  const createProvider = (
    subscribeFn: ConstructorParameters<
      typeof LazyContextProvider<typeof testContext>
    >[1]["subscribeFn"]
  ) =>
    new LazyContextProvider<typeof testContext>(
      host as unknown as ReactiveElement,
      { context: testContext, subscribeFn }
    );

  const request = (consumer: Element) => {
    const callback = vi.fn();
    consumer.dispatchEvent(
      new ContextEvent(testContext, consumer, callback, true)
    );
    return callback;
  };

  const addConsumer = () => {
    const consumer = document.createElement("div");
    host.appendChild(consumer);
    return consumer;
  };

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
  });

  afterEach(() => {
    host.remove();
  });

  it("retries the subscription after the subscribe promise rejects", async () => {
    let setValue: ((value: string[]) => void) | undefined;
    const subscribeFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("failed"))
      .mockImplementation((_conn, set) => {
        setValue = set;
        return Promise.resolve((() => undefined) as UnsubscribeFunc);
      });
    const provider = createProvider(subscribeFn);
    provider.setConnection(connection);

    const callback = request(addConsumer());
    await tick();
    expect(subscribeFn).toHaveBeenCalledTimes(1);
    expect(callback).not.toHaveBeenCalled();

    provider.setConnection(connection);
    expect(subscribeFn).toHaveBeenCalledTimes(2);

    setValue!(["a"]);
    expect(callback).toHaveBeenCalledWith(["a"], expect.any(Function));
  });

  it("retries on the next request after the subscribe function throws", () => {
    const subscribeFn = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("failed");
      })
      .mockImplementation((_conn, set) => {
        set(["a"]);
        return () => undefined;
      });
    const provider = createProvider(subscribeFn);
    provider.setConnection(connection);

    const first = request(addConsumer());
    expect(first).not.toHaveBeenCalled();

    const second = request(addConsumer());
    expect(subscribeFn).toHaveBeenCalledTimes(2);
    expect(first).toHaveBeenCalledWith(["a"], expect.any(Function));
    expect(second).toHaveBeenCalledWith(["a"], expect.any(Function));
  });

  it("drops pending consumers that disconnected before the first value", () => {
    vi.useFakeTimers();
    try {
      let setValue: ((value: string[]) => void) | undefined;
      const unsubscribe = vi.fn();
      const subscribeFn = vi.fn((_conn, set) => {
        setValue = set;
        return unsubscribe;
      });
      const provider = createProvider(subscribeFn);
      provider.setConnection(connection);

      const consumer = addConsumer();
      const callback = request(consumer);
      consumer.remove();

      setValue!(["a"]);
      expect(callback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(5000);
      expect(unsubscribe).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
