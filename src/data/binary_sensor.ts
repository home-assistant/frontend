// Taken from homeassistant.components.binary_sensor

// On means low, Off means normal
export const DEVICE_CLASS_BATTERY = "battery";

// On means charging, Off means not charging
export const DEVICE_CLASS_BATTERY_CHARGING = "battery_charging";

// On means cold, Off means normal
export const DEVICE_CLASS_COLD = "cold";

// On means connected, Off means disconnected
export const DEVICE_CLASS_CONNECTIVITY = "connectivity";

// On means open, Off means closed
export const DEVICE_CLASS_DOOR = "door";

// On means open, Off means closed
export const DEVICE_CLASS_GARAGE_DOOR = "garage_door";

// On means gas detected, Off means no gas (clear)
export const DEVICE_CLASS_GAS = "gas";

// On means hot, Off means normal
export const DEVICE_CLASS_HEAT = "heat";

// On means light detected, Off means no light
export const DEVICE_CLASS_LIGHT = "light";

// On means open (unlocked), Off means closed (locked)
export const DEVICE_CLASS_LOCK = "lock";

// On means wet, Off means dry
export const DEVICE_CLASS_MOISTURE = "moisture";

// On means motion detected, Off means no motion (clear)
export const DEVICE_CLASS_MOTION = "motion";

// On means moving, Off means not moving (stopped)
export const DEVICE_CLASS_MOVING = "moving";

// On means occupied, Off means not occupied (clear)
export const DEVICE_CLASS_OCCUPANCY = "occupancy";

// On means open, Off means closed
export const DEVICE_CLASS_OPENING = "opening";

// On means plugged in, Off means unplugged
export const DEVICE_CLASS_PLUG = "plug";

// On means power detected, Off means no power
export const DEVICE_CLASS_POWER = "power";

// On means home, Off means away
export const DEVICE_CLASS_PRESENCE = "presence";

// On means problem detected, Off means no problem (OK)
export const DEVICE_CLASS_PROBLEM = "problem";

// On means unsafe, Off means safe
export const DEVICE_CLASS_SAFETY = "safety";

// On means smoke detected, Off means no smoke (clear)
export const DEVICE_CLASS_SMOKE = "smoke";

// On means sound detected, Off means no sound (clear)
export const DEVICE_CLASS_SOUND = "sound";

// On means vibration detected, Off means no vibration
export const DEVICE_CLASS_VIBRATION = "vibration";

// On means open, Off means closed
export const DEVICE_CLASS_WINDOW = "window";

export const DEVICE_CLASSES = [
  DEVICE_CLASS_BATTERY,
  DEVICE_CLASS_BATTERY_CHARGING,
  DEVICE_CLASS_COLD,
  DEVICE_CLASS_CONNECTIVITY,
  DEVICE_CLASS_DOOR,
  DEVICE_CLASS_GARAGE_DOOR,
  DEVICE_CLASS_GAS,
  DEVICE_CLASS_HEAT,
  DEVICE_CLASS_LIGHT,
  DEVICE_CLASS_LOCK,
  DEVICE_CLASS_MOISTURE,
  DEVICE_CLASS_MOTION,
  DEVICE_CLASS_MOVING,
  DEVICE_CLASS_OCCUPANCY,
  DEVICE_CLASS_OPENING,
  DEVICE_CLASS_PLUG,
  DEVICE_CLASS_POWER,
  DEVICE_CLASS_PRESENCE,
  DEVICE_CLASS_PROBLEM,
  DEVICE_CLASS_SAFETY,
  DEVICE_CLASS_SMOKE,
  DEVICE_CLASS_SOUND,
  DEVICE_CLASS_VIBRATION,
  DEVICE_CLASS_WINDOW,
];
