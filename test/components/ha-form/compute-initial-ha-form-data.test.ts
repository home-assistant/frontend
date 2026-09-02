import { describe, expect, it } from "vitest";
import { DEFAULT_MIN_KELVIN } from "../../../src/common/color/convert-light-color";
import { computeInitialHaFormData } from "../../../src/components/ha-form/compute-initial-ha-form-data";
import type { Selector } from "../../../src/data/selector";
import type { HaFormSchema } from "../../../src/components/ha-form/types";

const requiredField = (selector: Selector): HaFormSchema => ({
  name: "value",
  required: true,
  selector,
});

const optionalField = (selector: Selector): HaFormSchema => ({
  name: "value",
  required: false,
  selector,
});

describe("computeInitialHaFormData", () => {
  it("initializes required text selector with an empty string", () => {
    expect(computeInitialHaFormData([requiredField({ text: {} })])).toEqual({
      value: "",
    });
  });

  it("initializes required multiple text selector with an empty array", () => {
    expect(
      computeInitialHaFormData([
        requiredField({
          text: {
            multiple: true,
          },
        }),
      ])
    ).toEqual({
      value: [],
    });
  });

  it("initializes required object selector with an empty string", () => {
    expect(computeInitialHaFormData([requiredField({ object: {} })])).toEqual({
      value: "",
    });
  });

  it("initializes required multiple object selector with an empty array", () => {
    expect(
      computeInitialHaFormData([
        requiredField({
          object: {
            multiple: true,
          },
        }),
      ])
    ).toEqual({
      value: [],
    });
  });

  it("leaves a required single device class selector unset", () => {
    expect(
      computeInitialHaFormData([
        requiredField({
          device_class: {
            domain: "sensor",
          },
        }),
      ])
    ).toEqual({});
  });

  it("initializes a required multiple device class selector with an empty array", () => {
    expect(
      computeInitialHaFormData([
        requiredField({
          device_class: {
            domain: "sensor",
            multiple: true,
          },
        }),
      ])
    ).toEqual({
      value: [],
    });
  });

  it("does not initialize optional text selectors", () => {
    expect(
      computeInitialHaFormData([
        optionalField({ text: {} }),
        {
          ...optionalField({
            text: {
              multiple: true,
            },
          }),
          name: "multiple",
        },
      ])
    ).toEqual({});
  });

  it("does not initialize optional object selectors", () => {
    expect(
      computeInitialHaFormData([
        optionalField({ object: {} }),
        {
          ...optionalField({
            object: {
              multiple: true,
            },
          }),
          name: "multiple",
        },
      ])
    ).toEqual({});
  });

  it("initializes a required constant selector without losing falsy values", () => {
    expect(
      computeInitialHaFormData([
        requiredField({
          constant: {
            value: false,
          },
        }),
      ])
    ).toEqual({
      value: false,
    });

    expect(
      computeInitialHaFormData([
        requiredField({
          constant: {
            value: 0,
          },
        }),
      ])
    ).toEqual({
      value: 0,
    });
  });

  it("initializes a required choose selector from a constant first choice", () => {
    const schema = [
      {
        name: "match",
        required: true,
        selector: {
          choose: {
            choices: {
              Disabled: {
                selector: {
                  constant: {
                    value: "",
                  },
                },
              },
              Enabled: {
                selector: {
                  number: {},
                },
              },
            },
          },
        },
      },
    ] as const;

    expect(computeInitialHaFormData(schema)).toEqual({
      match: {
        active_choice: "Disabled",
        Disabled: "",
      },
    });
  });

  it("initializes a required choose selector from its child selector", () => {
    const schema = [
      {
        name: "mode",
        required: true,
        selector: {
          choose: {
            choices: {
              First: {
                selector: {
                  text: {
                    multiple: true,
                  },
                },
              },
              Second: {
                selector: {
                  text: {},
                },
              },
            },
          },
        },
      },
    ] as const;

    expect(computeInitialHaFormData(schema)).toEqual({
      mode: {
        active_choice: "First",
        First: [],
      },
    });
  });

  it("initializes a required date selector with a date-only value", () => {
    const result = computeInitialHaFormData([requiredField({ date: {} })]);

    expect(result.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("initializes a required datetime selector with its canonical format", () => {
    const result = computeInitialHaFormData([requiredField({ datetime: {} })]);

    expect(result.value).toMatch(/^\d{4}-\d{2}-\d{2} 00:00:00$/);
  });

  it("initializes a required kelvin color temperature from its minimum", () => {
    expect(
      computeInitialHaFormData([
        requiredField({
          color_temp: {
            unit: "kelvin",
            min: 2000,
          },
        }),
      ])
    ).toEqual({
      value: 2000,
    });

    expect(
      computeInitialHaFormData([
        requiredField({
          color_temp: {
            unit: "kelvin",
          },
        }),
      ])
    ).toEqual({
      value: DEFAULT_MIN_KELVIN,
    });
  });

  it("initializes a required mired color temperature from its minimum", () => {
    expect(
      computeInitialHaFormData([
        requiredField({
          color_temp: {
            unit: "mired",
            min: 160,
          },
        }),
      ])
    ).toEqual({
      value: 160,
    });

    expect(
      computeInitialHaFormData([
        requiredField({
          color_temp: {
            unit: "mired",
            min_mireds: 170,
          },
        }),
      ])
    ).toEqual({
      value: 170,
    });

    expect(
      computeInitialHaFormData([
        requiredField({
          color_temp: {
            unit: "mired",
          },
        }),
      ])
    ).toEqual({
      value: 153,
    });
  });

  it("throws for an unsupported required selector", () => {
    expect(() =>
      computeInitialHaFormData([
        requiredField({
          ui_action: {
            default_action: "none",
          },
        }),
      ])
    ).toThrow("Selector ui_action not supported in initial form data");
  });

  it("omits a first choose child without an initial value", () => {
    const schema = [
      {
        name: "mode",
        required: true,
        selector: {
          choose: {
            choices: {
              First: {
                selector: {
                  ui_action: {
                    default_action: "none",
                  },
                },
              },
              Second: {
                selector: {
                  text: {},
                },
              },
            },
          },
        },
      },
    ] as const;

    expect(computeInitialHaFormData(schema)).toStrictEqual({
      mode: {
        active_choice: "First",
      },
    });
  });
});
