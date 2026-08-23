import { beforeEach, describe, expect, it, vi } from "vitest";

import "../../../src/components/ha-selector/ha-selector-object";
import type { HaObjectSelector } from "../../../src/components/ha-selector/ha-selector-object";
import type { HaFormSchema } from "../../../src/components/ha-form/types";
import type { ObjectSelector } from "../../../src/data/selector";
import { showFormDialog } from "../../../src/dialogs/form/show-form-dialog";
import type { HomeAssistant } from "../../../src/types";

vi.mock("../../../src/dialogs/form/show-form-dialog", () => ({
  showFormDialog: vi.fn(),
}));

const chooseDefault = {
  active_choice: "Temperature",
  Temperature: 4000,
};

const objectSelector: ObjectSelector = {
  object: {
    fields: {
      required: {
        selector: { text: {} },
        required: true,
      },
      number: {
        selector: { number: {} },
        default: 0,
      },
      boolean: {
        selector: { boolean: {} },
        default: false,
      },
      text: {
        selector: { text: {} },
        default: "",
      },
      entities: {
        selector: { entity: { multiple: true } },
        default: [],
      },
      object: {
        selector: { object: {} },
        default: {},
      },
      choose: {
        selector: {
          choose: {
            choices: {
              Disabled: { selector: { boolean: {} } },
              Temperature: { selector: { number: {} } },
            },
          },
        },
        default: chooseDefault,
      },
    },
  },
};

const callPrivateMethod = <Result>(
  element: object,
  method: string,
  ...args: unknown[]
): Result =>
  Reflect.apply(
    Reflect.get(element, method) as (...methodArgs: unknown[]) => Result,
    element,
    args
  );

describe("ha-selector-object", () => {
  beforeEach(() => {
    vi.mocked(showFormDialog).mockReset();
    vi.mocked(showFormDialog).mockResolvedValue(null);
  });

  it("includes explicit field defaults in the form schema", () => {
    const element = document.createElement(
      "ha-selector-object"
    ) as HaObjectSelector;

    const schema = callPrivateMethod<HaFormSchema[]>(
      element,
      "_schema",
      objectSelector
    );

    expect(schema).toStrictEqual([
      { name: "required", selector: { text: {} }, required: true },
      { name: "number", selector: { number: {} }, required: false, default: 0 },
      {
        name: "boolean",
        selector: { boolean: {} },
        required: false,
        default: false,
      },
      { name: "text", selector: { text: {} }, required: false, default: "" },
      {
        name: "entities",
        selector: { entity: { multiple: true } },
        required: false,
        default: [],
      },
      {
        name: "object",
        selector: { object: {} },
        required: false,
        default: {},
      },
      {
        name: "choose",
        selector: {
          choose: {
            choices: {
              Disabled: { selector: { boolean: {} } },
              Temperature: { selector: { number: {} } },
            },
          },
        },
        required: false,
        default: chooseDefault,
      },
    ]);
  });

  it("initializes new items with only explicit field defaults", async () => {
    const element = document.createElement(
      "ha-selector-object"
    ) as HaObjectSelector;

    element.hass = {
      localize: (key: string) => key,
    } as HomeAssistant;
    element.selector = objectSelector;

    await callPrivateMethod<Promise<void>>(element, "_addItem", {
      stopPropagation: vi.fn(),
    } as unknown as Event);

    expect(showFormDialog).toHaveBeenCalledTimes(1);
    expect(showFormDialog).toHaveBeenCalledWith(
      element,
      expect.objectContaining({
        data: {
          number: 0,
          boolean: false,
          text: "",
          entities: [],
          object: {},
          choose: chooseDefault,
        },
      })
    );
  });
});
