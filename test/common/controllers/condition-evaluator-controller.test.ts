import type { ReactiveControllerHost } from "@lit/reactive-element/reactive-controller";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConditionEvaluation } from "../../../src/common/controllers/condition-evaluator-controller";
import { ConditionEvaluatorController } from "../../../src/common/controllers/condition-evaluator-controller";
import type { VisibilityCondition } from "../../../src/panels/lovelace/common/validate-condition";
import type { HomeAssistant } from "../../../src/types";

const cond = (c: any): VisibilityCondition => c as VisibilityCondition;

const tick = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 10);
  });

interface CapturedSubscription {
  condition: any;
  push: (message: {
    result?: boolean;
    error?: string | { code: string; message: string };
  }) => void;
  unsub: ReturnType<typeof vi.fn>;
}

let subs: CapturedSubscription[];

const createHost = (): ReactiveControllerHost => ({
  addController: vi.fn(),
  removeController: vi.fn(),
  requestUpdate: vi.fn(),
  updateComplete: Promise.resolve(true),
});

const createHass = (overrides: Partial<HomeAssistant> = {}): HomeAssistant =>
  ({
    connection: {
      subscribeMessage: vi.fn((onChange: any, msg: any) => {
        const unsub = vi.fn();
        subs.push({ condition: msg.condition, push: onChange, unsub });
        return Promise.resolve(unsub);
      }),
    },
    states: {},
    user: { id: "user1" },
    locale: { time_zone: "local" },
    config: { time_zone: "America/New_York" },
    ...overrides,
  }) as unknown as HomeAssistant;

interface Harness {
  controller: ConditionEvaluatorController;
  host: ReactiveControllerHost;
  results: { result: ConditionEvaluation; error?: string }[];
  last: () => { result: ConditionEvaluation; error?: string } | undefined;
}

const setup = async (
  conditions: VisibilityCondition[],
  hass: HomeAssistant = createHass()
): Promise<Harness> => {
  const host = createHost();
  const results: { result: ConditionEvaluation; error?: string }[] = [];
  const controller = new ConditionEvaluatorController(host, {
    resubscribeDelay: 0,
    onResult: (result, error) => results.push({ result, error }),
  });
  controller.hostConnected();
  controller.observe(conditions, hass);
  await tick();
  return { controller, host, results, last: () => results[results.length - 1] };
};

describe("ConditionEvaluatorController", () => {
  beforeEach(() => {
    subs = [];
    global.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("evaluates an all-client tree without opening subscriptions", async () => {
    const { controller, last } = await setup([
      cond({ condition: "user", users: ["user1"] }),
    ]);
    expect(subs).toHaveLength(0);
    expect(controller.result).toBe("visible");
    expect(last()?.result).toBe("visible");
  });

  it("hides when an all-client condition is not met", async () => {
    const { controller } = await setup([
      cond({ condition: "user", users: ["other"] }),
    ]);
    expect(controller.result).toBe("hidden");
  });

  it("opens one subscription per server leaf with the translated core condition", async () => {
    const { controller } = await setup([
      cond({ condition: "state", entity: "light.a", state: "on" }),
    ]);
    expect(subs).toHaveLength(1);
    expect(subs[0].condition).toEqual({
      condition: "state",
      entity_id: "light.a",
      state: "on",
    });
    // unknown until the first push
    expect(controller.result).toBe("unknown");
  });

  it("updates the result from server pushes", async () => {
    const { controller } = await setup([
      cond({ condition: "state", entity: "light.a", state: "on" }),
    ]);
    subs[0].push({ result: true });
    expect(controller.result).toBe("visible");
    subs[0].push({ result: false });
    expect(controller.result).toBe("hidden");
  });

  it("groups sibling server conditions into a single subscription", async () => {
    await setup([
      cond({ condition: "state", entity: "light.a", state: "on" }),
      cond({ condition: "template", value_template: "{{ true }}" }),
    ]);
    expect(subs).toHaveLength(1);
    expect(subs[0].condition).toEqual({
      condition: "and",
      conditions: [
        { condition: "state", entity_id: "light.a", state: "on" },
        { condition: "template", value_template: "{{ true }}" },
      ],
    });
  });

  it("combines a server subtree with a client leaf", async () => {
    // user1 matches → client leaf true; result follows the server push
    const { controller } = await setup([
      cond({ condition: "state", entity: "light.a", state: "on" }),
      cond({ condition: "user", users: ["user1"] }),
    ]);
    expect(subs).toHaveLength(1);
    subs[0].push({ result: true });
    expect(controller.result).toBe("visible");
    subs[0].push({ result: false });
    expect(controller.result).toBe("hidden");
  });

  it("hides and surfaces the message on a subscription error", async () => {
    const { controller, last } = await setup([
      cond({ condition: "state", entity: "light.a", state: "on" }),
    ]);
    subs[0].push({ error: "Invalid condition" });
    expect(controller.result).toBe("hidden");
    expect(controller.error).toBe("Invalid condition");
    expect(last()?.error).toBe("Invalid condition");
  });

  it("clears the error once the subscription recovers", async () => {
    const { controller } = await setup([
      cond({ condition: "state", entity: "light.a", state: "on" }),
    ]);
    subs[0].push({ error: "boom" });
    expect(controller.error).toBe("boom");
    subs[0].push({ result: true });
    expect(controller.result).toBe("visible");
    expect(controller.error).toBeUndefined();
  });

  it("re-subscribes when the condition tree changes and tears the old one down", async () => {
    const hass = createHass();
    const host = createHost();
    const controller = new ConditionEvaluatorController(host, {
      resubscribeDelay: 0,
      onResult: () => undefined,
    });
    controller.hostConnected();

    controller.observe(
      [cond({ condition: "state", entity: "light.a", state: "on" })],
      hass
    );
    await tick();
    expect(subs).toHaveLength(1);
    const firstUnsub = subs[0].unsub;

    controller.observe(
      [cond({ condition: "state", entity: "light.b", state: "off" })],
      hass
    );
    await tick();

    expect(firstUnsub).toHaveBeenCalledTimes(1);
    expect(subs).toHaveLength(2);
    expect(subs[1].condition).toEqual({
      condition: "state",
      entity_id: "light.b",
      state: "off",
    });
  });

  it("does not re-subscribe when only hass changes", async () => {
    const conditions = [
      cond({ condition: "state", entity: "light.a", state: "on" }),
    ];
    const { controller } = await setup(conditions);
    expect(subs).toHaveLength(1);

    // same conditions reference, new hass → recompute only, no new subscription
    controller.observe(conditions, createHass());
    await tick();
    expect(subs).toHaveLength(1);
  });

  it("tears down subscriptions on host disconnect", async () => {
    const { controller } = await setup([
      cond({ condition: "state", entity: "light.a", state: "on" }),
    ]);
    const { unsub } = subs[0];
    controller.hostDisconnected();
    await tick();
    expect(unsub).toHaveBeenCalledTimes(1);
  });

  it("ignores pushes that arrive after teardown", async () => {
    const { controller } = await setup([
      cond({ condition: "state", entity: "light.a", state: "on" }),
    ]);
    const stale = subs[0];
    controller.hostDisconnected();
    await tick();
    stale.push({ result: true });
    // still unknown — the stale push from the torn-down subscription is ignored
    expect(controller.result).toBe("unknown");
  });

  it("notifies onResult only when the result actually changes", async () => {
    const { results } = await setup([
      cond({ condition: "state", entity: "light.a", state: "on" }),
    ]);
    const countBefore = results.length;
    subs[0].push({ result: true });
    subs[0].push({ result: true });
    subs[0].push({ result: true });
    // one change (unknown → visible), the repeats are coalesced
    expect(results.length).toBe(countBefore + 1);
    expect(results[results.length - 1].result).toBe("visible");
  });

  it("requests a host update when the result changes", async () => {
    const { host } = await setup([
      cond({ condition: "state", entity: "light.a", state: "on" }),
    ]);
    (host.requestUpdate as ReturnType<typeof vi.fn>).mockClear();
    subs[0].push({ result: true });
    expect(host.requestUpdate).toHaveBeenCalled();
  });
});
