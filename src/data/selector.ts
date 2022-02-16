export type Selector =
  | AddonSelector
  | AttributeSelector
  | EntitySelector
  | DeviceSelector
  | DurationSelector
  | AreaSelector
  | TargetSelector
  | NumberSelector
  | BooleanSelector
  | TimeSelector
  | ActionSelector
  | StringSelector
  | ObjectSelector
  | SelectSelector
  | IconSelector
  | MediaSelector;

export interface EntitySelector {
  entity: {
    integration?: string;
    domain?: string;
    device_class?: string;
  };
}

export interface AttributeSelector {
  attribute: {
    entity_id: string;
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

export interface DurationSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  duration: {};
}

export interface AddonSelector {
  addon: {
    name?: string;
    slug?: string;
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
    step?: number;
    mode?: "box" | "slider";
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
    multiline?: boolean;
    type?:
      | "number"
      | "text"
      | "search"
      | "tel"
      | "url"
      | "email"
      | "password"
      | "date"
      | "month"
      | "week"
      | "time"
      | "datetime-local"
      | "color";
    suffix?: string;
  };
}

export interface ObjectSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  object: {};
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectSelector {
  select: {
    options: string[] | SelectOption[];
  };
}

export interface IconSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  icon: {};
}

export interface MediaSelector {
  // eslint-disable-next-line @typescript-eslint/ban-types
  media: {};
}

export interface MediaSelectorValue {
  entity_id?: string;
  media_content_id?: string;
  media_content_type?: string;
  metadata?: {
    title?: string;
    thumbnail?: string | null;
    media_class?: string;
    children_media_class?: string | null;
    navigateIds?: { media_content_type: string; media_content_id: string }[];
  };
}
