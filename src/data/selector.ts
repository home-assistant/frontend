export type Selector =
  | EntitySelector
  | DeviceSelector
  | AreaSelector
  | NumberSelector
  | BooleanSelector
  | TimeSelector;

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
    entity?: EntitySelector["entity"];
  };
}

export interface AreaSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  area: {};
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
  // eslint-disable-next-line @typescript-eslint/ban-types
  boolean: {};
}

export interface TimeSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  time: {};
}
