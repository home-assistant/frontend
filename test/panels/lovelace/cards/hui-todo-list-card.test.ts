import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import "../../../../src/panels/lovelace/cards/hui-todo-list-card";
import type { HuiTodoListCard } from "../../../../src/panels/lovelace/cards/hui-todo-list-card";
import type { TodoListCardConfig } from "../../../../src/panels/lovelace/cards/types";
import type * as TodoData from "../../../../src/data/todo";
import type { HomeAssistant } from "../../../../src/types";

// Bundler-defined globals the card's import graph reads at eval time.
vi.hoisted(() => {
  Object.assign(globalThis, {
    __STATIC_PATH__: "/",
    __HASS_URL__: "",
    __BUILD__: "modern",
    __VERSION__: "test",
    __BACKWARDS_COMPAT__: false,
    __SUPERVISOR__: false,
    __NAMESPACE__: "frontend",
  });
});

vi.mock("../../../../src/data/todo", async (importOriginal) => ({
  ...(await importOriginal<typeof TodoData>()),
  subscribeItems: vi.fn(() => Promise.resolve(() => undefined)),
}));

class MockResizeObserver {
  observe = vi.fn();

  unobserve = vi.fn();

  disconnect = vi.fn();
}

vi.stubGlobal("ResizeObserver", MockResizeObserver);

beforeAll(() => {
  // jsdom's ElementInternals lacks the validity API used by wa-input.
  const internalsProto = window.ElementInternals.prototype as any;
  internalsProto.setValidity = vi.fn();
  internalsProto.setFormValue = vi.fn();
  internalsProto.checkValidity = () => true;
  internalsProto.reportValidity = () => true;
  internalsProto.states = new Set();
  Object.defineProperty(internalsProto, "validity", {
    get: () => ({ valid: true }),
    configurable: true,
  });
});

const ENTITY_ID = "todo.shopping_list";

const createHass = (): HomeAssistant =>
  ({
    states: {
      [ENTITY_ID]: {
        entity_id: ENTITY_ID,
        state: "0",
        // CREATE_TODO_ITEM
        attributes: { supported_features: 1 },
        context: { id: "", parent_id: null, user_id: null },
        last_changed: "",
        last_updated: "",
      },
    },
    locale: { language: "en" },
    user: { is_admin: true },
    themes: { default_theme: "default", themes: {} },
    localize: vi.fn((key: string) => key),
  }) as unknown as HomeAssistant;

let elements: HuiTodoListCard[] = [];

const mount = async (): Promise<HuiTodoListCard> => {
  const el = document.createElement("hui-todo-list-card") as HuiTodoListCard;
  el.setConfig({ type: "todo-list", entity: ENTITY_ID } as TodoListCardConfig);
  el.hass = createHass();
  document.body.appendChild(el);
  elements.push(el);
  await el.updateComplete;
  return el;
};

afterEach(() => {
  elements.forEach((el) => el.remove());
  elements = [];
});

describe("hui-todo-list-card", () => {
  // Android Chrome turns the virtual keyboard Enter key into "Next" when
  // another text field follows on the page (for example a second todo list
  // card) and moves focus there without sending a keydown. Setting an enter
  // key hint makes it send Enter, so the item gets added (#55203).
  it("sets an enter key hint on the add item input", async () => {
    const card = await mount();
    const input = card.shadowRoot!.querySelector("ha-input")!;
    expect(input).not.toBeNull();
    await input.updateComplete;
    const waInput = input.shadowRoot!.querySelector("wa-input")!;
    await waInput.updateComplete;
    const nativeInput = waInput.shadowRoot!.querySelector(
      '[part~="input"]'
    ) as HTMLInputElement;
    expect(nativeInput.getAttribute("enterkeyhint")).toBe("done");
  });
});
