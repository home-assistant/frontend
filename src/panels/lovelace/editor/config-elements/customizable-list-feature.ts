import type { HaFormSchema } from "../../../../components/ha-form/types";

interface CustomizableListSchemaParams {
  field: string;
  customize: boolean;
  options: { value: string; label: string }[];
}

export const customizableListSchema = ({
  field,
  customize,
  options,
}: CustomizableListSchemaParams) =>
  [
    {
      name: "customize",
      selector: { boolean: {} },
    },
    ...(customize
      ? ([
          {
            name: field,
            selector: {
              select: {
                mode: "list",
                reorder: true,
                multiple: true,
                options,
              },
            },
          },
        ] as const satisfies readonly HaFormSchema[])
      : []),
  ] as const satisfies readonly HaFormSchema[];

// `customize` is form-only and never stored in the config.
export const customizableListData = <T extends object>(
  config: T,
  field: string
): T & { customize: boolean } => ({
  ...config,
  customize: (config as Record<string, unknown>)[field] !== undefined,
});

// Dropping the field lets the feature fall back to its own default.
export const processCustomizableListValue = <T extends object>(
  value: T & { customize?: boolean },
  field: string,
  defaults: readonly string[]
): T => {
  const { customize, ...rest } = value;
  const config = rest as Record<string, unknown>;
  if (customize && !config[field]) {
    config[field] = [...defaults];
  } else if (!customize) {
    delete config[field];
  }
  return config as unknown as T;
};
