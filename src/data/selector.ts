export type Selector =
  | EntitySelector
  | DeviceSelector
  | NumberSelector
  | BooleanSelector
  | DateTimeSelector;

export interface EntitySelector {
  entity: {
    integration?: string;
    domain?: string;
    device_class?: string;
  };
}

export interface DeviceSelector {
  device: {
    integration?: string;
    manufacturer?: string;
    model?: string;
  };
}

export interface NumberSelector {
  number: {
    min: number;
    max: number;
    step: number;
    mode: "box" | "slider";
    unit_of_measurement?: string;
  };
}

export interface BooleanSelector {
  boolean: undefined;
}

export interface DateTimeSelector {
  datetime: {
    has_date?: boolean;
    has_time?: boolean;
  };
}
