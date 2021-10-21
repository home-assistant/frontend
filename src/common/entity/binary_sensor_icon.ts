import {
  mdiBattery,
  mdiBatteryOutline,
  mdiBatteryCharging,
  mdiThermometer,
  mdiSnowflake,
  mdiServerNetworkOff,
  mdiServerNetwork,
  mdiDoorClosed,
  mdiDoorOpen,
  mdiGarage,
  mdiGarageOpen,
  mdiPowerPlugOff,
  mdiPowerPlug,
  mdiCheckCircle,
  mdiAlertCircle,
  mdiSmoke,
  mdiFire,
  mdiBrightness5,
  mdiBrightness7,
  mdiLock,
  mdiLockOpen,
  mdiWaterOff,
  mdiWater,
  mdiWalk,
  mdiRun,
  mdiHomeOutline,
  mdiHome,
  mdiSquare,
  mdiSquareOutline,
  mdiMusicNoteOff,
  mdiMusicNote,
  mdiPackage,
  mdiPackageUp,
  mdiCropPortrait,
  mdiVibrate,
  mdiWindowClosed,
  mdiWindowOpen,
  mdiRadioboxBlank,
  mdiCheckboxMarkedCircle,
} from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";

/** Return an icon representing a binary sensor state. */

export const binarySensorIcon = (state?: string, stateObj?: HassEntity) => {
  const is_off = state === "off";
  switch (stateObj?.attributes.device_class) {
    case "battery":
      return is_off ? mdiBattery : mdiBatteryOutline;
    case "battery_charging":
      return is_off ? mdiBattery : mdiBatteryCharging;
    case "cold":
      return is_off ? mdiThermometer : mdiSnowflake;
    case "connectivity":
      return is_off ? mdiServerNetworkOff : mdiServerNetwork;
    case "door":
      return is_off ? mdiDoorClosed : mdiDoorOpen;
    case "garage_door":
      return is_off ? mdiGarage : mdiGarageOpen;
    case "power":
      return is_off ? mdiPowerPlugOff : mdiPowerPlug;
    case "gas":
    case "problem":
    case "safety":
    case "tamper":
      return is_off ? mdiCheckCircle : mdiAlertCircle;
    case "smoke":
      return is_off ? mdiCheckCircle : mdiSmoke;
    case "heat":
      return is_off ? mdiThermometer : mdiFire;
    case "light":
      return is_off ? mdiBrightness5 : mdiBrightness7;
    case "lock":
      return is_off ? mdiLock : mdiLockOpen;
    case "moisture":
      return is_off ? mdiWaterOff : mdiWater;
    case "motion":
      return is_off ? mdiWalk : mdiRun;
    case "occupancy":
      return is_off ? mdiHomeOutline : mdiHome;
    case "opening":
      return is_off ? mdiSquare : mdiSquareOutline;
    case "plug":
      return is_off ? mdiPowerPlugOff : mdiPowerPlug;
    case "presence":
      return is_off ? mdiHomeOutline : mdiHome;
    case "sound":
      return is_off ? mdiMusicNoteOff : mdiMusicNote;
    case "update":
      return is_off ? mdiPackage : mdiPackageUp;
    case "vibration":
      return is_off ? mdiCropPortrait : mdiVibrate;
    case "window":
      return is_off ? mdiWindowClosed : mdiWindowOpen;
    default:
      return is_off ? mdiRadioboxBlank : mdiCheckboxMarkedCircle;
  }
};
