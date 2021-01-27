export type Selector =
  | EntitySelector
  | DeviceSelector
  | AreaSelector
  | TargetSelector
  | NumberSelector
  | BooleanSelector
  | TimeSelector
  | ActionSelector
  | StringSelector
  | ObjectSelector;

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
    entity?: {
      domain?: EntitySelector["entity"]["domain"];
      device_class?: EntitySelector["entity"]["device_class"];
    };
  };
}

export interface AreaSelector {
  area: {
    entity?: {
      integration?: EntitySelector["entity"]["integration"];
      domain?: EntitySelector["entity"]["domain"];
      device_class?: EntitySelector["entity"]["device_class"];
    };
    device?: {
      integration?: DeviceSelector["device"]["integration"];
      manufacturer?: DeviceSelector["device"]["manufacturer"];
      model?: DeviceSelector["device"]["model"];
    };
  };
}

export interface TargetSelector {
  target: {
    entity?: {
      integration?: EntitySelector["entity"]["integration"];
      domain?: EntitySelector["entity"]["domain"];
      device_class?: EntitySelector["entity"]["device_class"];
    };
    device?: {
      integration?: DeviceSelector["device"]["integration"];
      manufacturer?: DeviceSelector["device"]["manufacturer"];
      model?: DeviceSelector["device"]["model"];
    };
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
  // eslint-disable-next-line @typescript-eslint/ban-types
  boolean: {};
}

export interface TimeSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  time: {};
}

export interface ActionSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  action: {};
}

export interface StringSelector {
  text: {
    multiline: boolean;
  };
}

export interface ObjectSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  object: {};
}
