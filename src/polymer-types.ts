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

export interface PolymerIronSelectEvent<T> extends Event {
  detail: {
    item: T;
  };
}

declare global {
  // for fire event
  interface HASSDomEvents {
    "hass-logout": undefined;
    "iron-resize": undefined;
    "config-refresh": undefined;
    "hass-api-called": {
      success: boolean;
      response: unknown;
    };
  }
}
