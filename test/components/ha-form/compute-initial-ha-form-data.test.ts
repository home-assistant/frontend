import { describe, expect, it } from "vitest";
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

  it("keeps an unsupported first choose child unset", () => {
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
        First: undefined,
      },
    });
  });
});
