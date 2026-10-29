import { ContextProvider } from "@lit/context";
import type { ContextType } from "@lit/context";
import type { Connection, UnsubscribeFunc } from "home-assistant-js-websocket";
import { LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConnectionSubscriptionController } from "../../src/data/connection-subscription-controller";
import { connectionContext } from "../../src/data/context";

// Cards that lost `hass` subscribe through this controller instead of
// `SubscribeMixin`. These rules keep a single live subscription per host:
// one per connection, closed on disconnect, and only while enabled.

type Subscribe = (
  connection: Connection
) => UnsubscribeFunc | Promise<UnsubscribeFunc>;

declare global {
  interface HTMLElementTagNameMap {
    "test-connection-subscription-host": TestHost;
  }
}

@customElement("test-connection-subscription-host")
class TestHost extends LitElement {
  @property({ attribute: false }) public enabled = true;

  public subscribe: Subscribe = () => () => undefined;

  constructor() {
    super();
    new ConnectionSubscriptionController(this, {
      enabled: () => this.enabled,
      subscribe: (connection) => this.subscribe(connection),
    });
  }

  protected render() {
    return nothing;
  }
}

const makeConnection = (id: string) => ({ id }) as unknown as Connection;

const contextValue = (connection: Connection) =>
  ({ connection }) as unknown as ContextType<typeof connectionContext>;

const containers: HTMLElement[] = [];

const mount = async (subscribe: Subscribe, enabled = true) => {
  const connection = makeConnection("a");
  const container = document.createElement("div");
  const provider = new ContextProvider(container, {
    context: connectionContext,
    initialValue: contextValue(connection),
  });
  const host = document.createElement("test-connection-subscription-host");
  host.subscribe = subscribe;
  host.enabled = enabled;
  container.appendChild(host);
  document.body.appendChild(container);
  containers.push(container);
  await host.updateComplete;
  return { host, provider, connection };
};

afterEach(() => {
  containers.splice(0).forEach((container) => container.remove());
});

describe("ConnectionSubscriptionController", () => {
  it("subscribes once with the connection from context", async () => {
    const subscribe = vi.fn(() => () => undefined);
    const { host, connection } = await mount(subscribe);
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledWith(connection);

    host.requestUpdate();
    await host.updateComplete;
    expect(subscribe).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes when the host disconnects", async () => {
    const unsub = vi.fn();
    const { host } = await mount(() => unsub);
    expect(unsub).not.toHaveBeenCalled();

    host.remove();
    expect(unsub).toHaveBeenCalledTimes(1);
  });

  it("closes a subscription that resolves after the host disconnected", async () => {
    const unsub = vi.fn();
    let resolve!: (unsub: UnsubscribeFunc) => void;
    const { host } = await mount(
      () =>
        new Promise<UnsubscribeFunc>((res) => {
          resolve = res;
        })
    );

    host.remove();
    resolve(unsub);
    await vi.waitFor(() => expect(unsub).toHaveBeenCalledTimes(1));
  });

  it("replaces the subscription when the connection changes", async () => {
    const unsubs: ReturnType<typeof vi.fn>[] = [];
    const subscribe = vi.fn(() => {
      const unsub = vi.fn();
      unsubs.push(unsub);
      return unsub;
    });
    const { host, provider } = await mount(subscribe);
    const replacement = makeConnection("b");

    provider.setValue(contextValue(replacement));
    await host.updateComplete;
    expect(unsubs[0]).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledTimes(2);
    expect(subscribe).toHaveBeenLastCalledWith(replacement);

    // Same connection again keeps the live subscription
    provider.setValue(contextValue(replacement));
    await host.updateComplete;
    expect(subscribe).toHaveBeenCalledTimes(2);
    expect(unsubs[1]).not.toHaveBeenCalled();
  });

  it("subscribes only while enabled", async () => {
    const unsub = vi.fn();
    const subscribe = vi.fn(() => unsub);
    const { host } = await mount(subscribe, false);
    expect(subscribe).not.toHaveBeenCalled();

    host.enabled = true;
    await host.updateComplete;
    expect(subscribe).toHaveBeenCalledTimes(1);

    host.enabled = false;
    await host.updateComplete;
    expect(unsub).toHaveBeenCalledTimes(1);

    host.enabled = true;
    await host.updateComplete;
    expect(subscribe).toHaveBeenCalledTimes(2);
  });
});
