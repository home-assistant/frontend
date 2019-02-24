export const applyPolymerEvent = <T>(
  ev: PolymerChangedEvent<T>,
  curValue: T
): T => {
  const { path, value } = ev.detail;
  if (!path) {
    return value;
  }
  const propName = path.split(".")[1];
  return { ...curValue, [propName]: value };
};

export interface PolymerChangedEvent<T> extends Event {
  detail: {
    value: T;
    path?: string;
    queueProperty: boolean;
  };
}

declare global {
  // for fire event
  interface HASSDomEvents {
    "hass-logout": undefined;
    "iron-resize": undefined;
    "config-refresh": undefined;
    "ha-refresh-cloud-status": undefined;
    "hass-more-info": {
      entityId: string;
    };
    "location-changed": undefined;
    "hass-notification": {
      message: string;
    };
  }
}
