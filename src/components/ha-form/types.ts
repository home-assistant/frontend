import type { LitElement } from "lit";
import type { Selector } from "../../data/selector";
import type { HaDurationData } from "../ha-duration-input";

export type HaFormSchema =
  | HaFormConstantSchema
  | HaFormStringSchema
  | HaFormIntegerSchema
  | HaFormFloatSchema
  | HaFormBooleanSchema
  | HaFormSelectSchema
  | HaFormMultiSelectSchema
  | HaFormTimeSchema
  | HaFormSelector
  | HaFormGridSchema
  | HaFormExpandableSchema
  | HaFormOptionalActionsSchema;

export interface HaFormBaseSchema {
  name: string;
  // This value is applied if no data is submitted for this field
  default?: HaFormData;
  required?: boolean;
  disabled?: boolean;
  description?: {
    suffix?: string;
    // This value will be set initially when form is loaded
    suggested_value?: HaFormData;
  };
  context?: Record<string, string>;
}

export interface HaFormGridSchema extends HaFormBaseSchema {
  type: "grid";
  flatten?: boolean;
  column_min_width?: string;
  schema: readonly HaFormSchema[];
}

export interface HaFormExpandableSchema extends HaFormBaseSchema {
  type: "expandable";
  flatten?: boolean;
  title?: string;
  icon?: string;
  iconPath?: string;
  expanded?: boolean;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  schema: readonly HaFormSchema[];
}

export interface HaFormOptionalActionsSchema extends HaFormBaseSchema {
  type: "optional_actions";
  flatten?: boolean;
  schema: readonly HaFormSchema[];
}

export interface HaFormSelector extends HaFormBaseSchema {
  type?: never;
  selector: Selector;
  hidden?: boolean;
}

export interface HaFormConstantSchema extends HaFormBaseSchema {
  type: "constant";
  value?: string;
}

export interface HaFormIntegerSchema extends HaFormBaseSchema {
  type: "integer";
  default?: HaFormIntegerData;
  valueMin?: number;
  valueMax?: number;
}

export interface HaFormSelectSchema extends HaFormBaseSchema {
  type: "select";
  options: readonly (readonly [string, string])[];
}

export interface HaFormMultiSelectSchema extends HaFormBaseSchema {
  type: "multi_select";
  options:
    | Record<string, string>
    | readonly string[]
    | readonly (readonly [string, string])[];
}

export interface HaFormFloatSchema extends HaFormBaseSchema {
  type: "float";
}

export interface HaFormStringSchema extends HaFormBaseSchema {
  type: "string";
  format?: string;
  autocomplete?: string;
  autofocus?: boolean;
}

export interface HaFormBooleanSchema extends HaFormBaseSchema {
  type: "boolean";
}

export interface HaFormTimeSchema extends HaFormBaseSchema {
  type: "positive_time_period_dict";
}

// Type utility to unionize a schema array by flattening any grid schemas
export type SchemaUnion<
  SchemaArray extends readonly HaFormSchema[],
  Schema = SchemaArray[number],
> = Schema extends
  | HaFormGridSchema
  | HaFormExpandableSchema
  | HaFormOptionalActionsSchema
  ? SchemaUnion<Schema["schema"]> | Schema
  : Schema;

export type HaFormDataContainer = Record<string, HaFormData>;

export type HaFormData =
  | HaFormStringData
  | HaFormIntegerData
  | HaFormFloatData
  | HaFormBooleanData
  | HaFormSelectData
  | HaFormMultiSelectData
  | HaFormTimeData;

export type HaFormStringData = string;
export type HaFormIntegerData = number;
export type HaFormFloatData = number;
export type HaFormBooleanData = boolean;
export type HaFormSelectData = string;
export type HaFormMultiSelectData = string[];
export type HaFormTimeData = HaDurationData;

export interface HaFormElement extends LitElement {
  schema: HaFormSchema | readonly HaFormSchema[];
  data?: HaFormDataContainer | HaFormData;
  label?: string;
}
