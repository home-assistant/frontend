// Force file to be a module to augment global scope.
export {};

export interface PolymerChangedEvent<T> extends Event {
  detail: {
    value: T;
  };
}

declare global {
  // for fire event
  interface HASSDomEvents {
    "hass-logout": undefined;
    "iron-resize": undefined;
    "config-refresh": undefined;
    "ha-refresh-cloud-status": undefined;
    "location-changed": undefined;
    "hass-notification": {
      message: string;
    };
  }
}
