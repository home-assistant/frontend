export type LovelaceCondition =
  | LovelaceNumericStateCondition
  | LovelaceStateCondition
  | LovelaceScreenCondition
  | LovelaceOrCondition
  | LovelaceAndCondition
  | LovelaceUserCondition;

export type LovelaceBaseCondition = {
  condition: string;
};

export type LovelaceNumericStateCondition = LovelaceBaseCondition & {
  condition: "numeric_state";
  entity?: string;
  below?: string | number;
  above?: string | number;
};

export type LovelaceStateCondition = LovelaceBaseCondition & {
  condition: "state";
  entity?: string;
  state?: string | string[];
  state_not?: string | string[];
};

export type LovelaceScreenCondition = LovelaceBaseCondition & {
  condition: "screen";
  media_query?: string;
};

export type LovelaceUserCondition = LovelaceBaseCondition & {
  condition: "user";
  users?: string[];
};

export type LovelaceOrCondition = LovelaceBaseCondition & {
  condition: "or";
  conditions?: LovelaceCondition[];
};

export type LovelaceAndCondition = LovelaceBaseCondition & {
  condition: "and";
  conditions?: LovelaceCondition[];
};
