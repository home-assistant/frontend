import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { HaChooseSelector } from "../../../src/components/ha-selector/ha-selector-choose";

class HaSelectorStub extends HTMLElement {
  public hass?: unknown;
  public selector?: unknown;
  public value?: unknown;
  public disabled?: boolean;
  public required?: boolean;
  public helper?: string;
  public localizeValue?: (key: string) => string;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector": HaSelectorStub;
  }
}

// Mock the child selector so its real selector tree cannot start async imports.
vi.mock("../../../src/components/ha-selector/ha-selector", () => {
  if (!customElements.get("ha-selector")) {
    customElements.define("ha-selector", HaSelectorStub);
  }

  return { HaSelector: HaSelectorStub };
});

beforeAll(async () => {
  // Handle 'setValidity is not a function' on the button group.
  Object.defineProperty(HTMLElement.prototype, "attachInternals", {
    configurable: true,
    value() {
      return {
        setValidity: () => {
          /* empty */
        },
        setFormValue: () => {
          /* empty */
        },
        checkValidity: () => true,
        reportValidity: () => true,
        validity: {},
        validationMessage: "",
        willValidate: true,
      };
    },
  });

  await import("../../../src/components/ha-selector/ha-selector-choose");
});

describe("<ha-selector-choose>", () => {
  const selector = {
    choose: {
      choices: {
        text: { selector: { text: {} } },
        entity: { selector: { entity: {} } },
        number: { selector: { number: {} } },
        duration: { selector: { duration: {} } },
        template: { selector: { template: {} } },
      },
    },
  } as any;

  beforeEach(() => {
    document.body.innerHTML = "";
  });

  const waitForSelector = async (element: HaChooseSelector) => {
    await element.updateComplete;
  };

  const createElement = async (value: unknown) => {
    const element = document.createElement(
      "ha-selector-choose"
    ) as HaChooseSelector;

    element.hass = {} as any;
    element.selector = selector;
    element.value = value;

    document.body.append(element);
    await waitForSelector(element);

    return element;
  };

  it("uses value.active_choice as the initial active choice when it exists", async () => {
    const element = await createElement({
      active_choice: "entity",
      entity: "light.kitchen",
    });

    expect(element._activeChoice).toBe("entity");

    const toggleGroup = element.shadowRoot!.querySelector(
      "ha-button-toggle-group"
    ) as HTMLElementTagNameMap["ha-button-toggle-group"];
    expect(toggleGroup.active).toBe("entity");

    const nestedSelector = element.shadowRoot!.querySelector(
      "ha-selector"
    ) as HTMLElementTagNameMap["ha-selector"];
    expect(nestedSelector.selector).toEqual(
      selector.choose.choices.entity.selector
    );
    expect(nestedSelector.value).toBe("light.kitchen");
  });

  it("falls back to the first choice for an undefined initial value", async () => {
    const element = await createElement(undefined);

    expect(element._activeChoice).toBe("text");
  });

  it("falls back to text for an initial text value without active_choice", async () => {
    const element = await createElement("hello world");

    expect(element._activeChoice).toBe("text");
  });

  it("falls back to entity for an initial entity_id value without active_choice", async () => {
    const element = await createElement("sun.sun");

    expect(element._activeChoice).toBe("entity");
  });

  it("changes active choice when a new value specifies a valid active_choice", async () => {
    const element = await createElement({
      active_choice: "text",
      text: "hello",
    });

    expect(element._activeChoice).toBe("text");

    element.value = {
      active_choice: "entity",
      entity: "light.kitchen",
    };
    await waitForSelector(element);

    expect(element._activeChoice).toBe("entity");

    const nestedSelector = element.shadowRoot!.querySelector(
      "ha-selector"
    ) as HTMLElementTagNameMap["ha-selector"];
    expect(nestedSelector.selector).toEqual(
      selector.choose.choices.entity.selector
    );
    expect(nestedSelector.value).toBe("light.kitchen");
  });

  it("keeps the active choice when the next value has no active_choice", async () => {
    const element = await createElement({
      active_choice: "entity",
      entity: "light.kitchen",
    });

    element.value = "plain text";
    await waitForSelector(element);

    expect(element._activeChoice).toBe("entity");

    const nestedSelector = element.shadowRoot!.querySelector(
      "ha-selector"
    ) as HTMLElementTagNameMap["ha-selector"];
    expect(nestedSelector.selector).toEqual(
      selector.choose.choices.entity.selector
    );
    expect(nestedSelector.value).toBe("plain text");
  });

  it("does not switch choices when the updated value retains its active_choice", async () => {
    const element = await createElement({
      active_choice: "entity",
      entity: "light.kitchen",
    });

    element.value = {
      active_choice: "entity",
      entity: "light.living_room",
    };
    await waitForSelector(element);

    expect(element._activeChoice).toBe("entity");

    const nestedSelector = element.shadowRoot!.querySelector(
      "ha-selector"
    ) as HTMLElementTagNameMap["ha-selector"];
    expect(nestedSelector.value).toBe("light.living_room");
  });

  it("passes an object without active_choice through to a duration selector", async () => {
    const duration = {
      hours: 0,
      minutes: 5,
      seconds: 0,
    };
    const element = await createElement(duration);

    expect(element._activeChoice).toBe("duration");

    const nestedSelector = element.shadowRoot!.querySelector(
      "ha-selector"
    ) as HTMLElementTagNameMap["ha-selector"];

    expect(nestedSelector.selector).toEqual(
      selector.choose.choices.duration.selector
    );
    expect(nestedSelector.value).toEqual(duration);
  });

  it("passes a template without active_choice through to a template selector", async () => {
    const template = "{{ xyz }}";
    const element = await createElement(template);

    expect(element._activeChoice).toBe("template");

    const nestedSelector = element.shadowRoot!.querySelector(
      "ha-selector"
    ) as HTMLElementTagNameMap["ha-selector"];

    expect(nestedSelector.selector).toEqual(
      selector.choose.choices.template.selector
    );
    expect(nestedSelector.value).toEqual(template);
  });
});
