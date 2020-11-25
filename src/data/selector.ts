export type Selector = EntitySelector | DeviceSelector;

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
