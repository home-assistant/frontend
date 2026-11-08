// Low precision sun and moon calculations for the weather page.
// The formulas follow the approximations from "Astronomy Answers"
// (https://aa.quae.nl/en/reken/hemelpositie.html), which are accurate to
// about a minute for rise and set times. Good enough for display purposes.

const RAD = Math.PI / 180;
const DAY_MS = 86400000;
const J1970 = 2440588;
const J2000 = 2451545;
const OBLIQUITY = RAD * 23.4397;
const SUN_DISTANCE_KM = 149598000;
// Mean length of a lunar cycle, in days
const SYNODIC_MONTH = 29.530588853;

// Altitude of the sun's upper limb at sunrise and sunset, including refraction
const SUN_HORIZON = -0.833 * RAD;
// Altitude of the moon's center at moonrise and moonset
const MOON_HORIZON = 0.133 * RAD;

const SAMPLE_STEP_MS = 5 * 60 * 1000;

export type MoonPhase =
  | "new_moon"
  | "waxing_crescent"
  | "first_quarter"
  | "waxing_gibbous"
  | "full_moon"
  | "waning_gibbous"
  | "last_quarter"
  | "waning_crescent";

interface EquatorialCoords {
  rightAscension: number;
  declination: number;
  distance: number;
}

const toDays = (date: Date): number =>
  date.getTime() / DAY_MS - 0.5 + J1970 - J2000;

const rightAscension = (l: number, b: number): number =>
  Math.atan2(
    Math.sin(l) * Math.cos(OBLIQUITY) - Math.tan(b) * Math.sin(OBLIQUITY),
    Math.cos(l)
  );

const declination = (l: number, b: number): number =>
  Math.asin(
    Math.sin(b) * Math.cos(OBLIQUITY) +
      Math.cos(b) * Math.sin(OBLIQUITY) * Math.sin(l)
  );

const siderealTime = (days: number, lw: number): number =>
  RAD * (280.16 + 360.9856235 * days) - lw;

const altitude = (hourAngle: number, phi: number, dec: number): number =>
  Math.asin(
    Math.sin(phi) * Math.sin(dec) +
      Math.cos(phi) * Math.cos(dec) * Math.cos(hourAngle)
  );

const sunCoords = (days: number): EquatorialCoords => {
  const meanAnomaly = RAD * (357.5291 + 0.98560028 * days);
  const center =
    RAD *
    (1.9148 * Math.sin(meanAnomaly) +
      0.02 * Math.sin(2 * meanAnomaly) +
      0.0003 * Math.sin(3 * meanAnomaly));
  const perihelion = RAD * 102.9372;
  const longitude = meanAnomaly + center + perihelion + Math.PI;
  return {
    rightAscension: rightAscension(longitude, 0),
    declination: declination(longitude, 0),
    distance: SUN_DISTANCE_KM,
  };
};

const moonCoords = (days: number): EquatorialCoords => {
  const meanLongitude = RAD * (218.316 + 13.176396 * days);
  const meanAnomaly = RAD * (134.963 + 13.064993 * days);
  const meanDistance = RAD * (93.272 + 13.22935 * days);
  const longitude = meanLongitude + RAD * 6.289 * Math.sin(meanAnomaly);
  const latitude = RAD * 5.128 * Math.sin(meanDistance);
  return {
    rightAscension: rightAscension(longitude, latitude),
    declination: declination(longitude, latitude),
    distance: 385001 - 20905 * Math.cos(meanAnomaly),
  };
};

const bodyAltitude = (
  coordsFn: (days: number) => EquatorialCoords,
  date: Date,
  latitude: number,
  longitude: number
): number => {
  const lw = RAD * -longitude;
  const phi = RAD * latitude;
  const days = toDays(date);
  const coords = coordsFn(days);
  const hourAngle = siderealTime(days, lw) - coords.rightAscension;
  return altitude(hourAngle, phi, coords.declination);
};

export const sunAltitude = (
  date: Date,
  latitude: number,
  longitude: number
): number => bodyAltitude(sunCoords, date, latitude, longitude);

export const moonAltitude = (
  date: Date,
  latitude: number,
  longitude: number
): number => bodyAltitude(moonCoords, date, latitude, longitude);

export interface RiseSet {
  rise?: Date;
  set?: Date;
}

/**
 * Find when a body crosses the horizon between `start` and `end` by sampling
 * its altitude. Linear interpolation between samples keeps the error well
 * below a minute.
 */
const findRiseSet = (
  altitudeFn: (date: Date) => number,
  horizon: number,
  start: Date,
  end: Date
): RiseSet => {
  const result: RiseSet = {};
  let prevTime = start.getTime();
  let prevAlt = altitudeFn(start) - horizon;
  for (
    let time = prevTime + SAMPLE_STEP_MS;
    time <= end.getTime();
    time += SAMPLE_STEP_MS
  ) {
    const alt = altitudeFn(new Date(time)) - horizon;
    if (prevAlt < 0 !== alt < 0) {
      const crossing = new Date(
        prevTime + ((time - prevTime) * prevAlt) / (prevAlt - alt)
      );
      if (alt > 0) {
        result.rise ??= crossing;
      } else {
        result.set ??= crossing;
      }
    }
    prevTime = time;
    prevAlt = alt;
  }
  return result;
};

const startOfDay = (date: Date): Date => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

const endOfDay = (date: Date): Date =>
  new Date(startOfDay(date).getTime() + DAY_MS);

export const getSunTimes = (
  date: Date,
  latitude: number,
  longitude: number
): RiseSet =>
  findRiseSet(
    (d) => sunAltitude(d, latitude, longitude),
    SUN_HORIZON,
    startOfDay(date),
    endOfDay(date)
  );

/** Sunrises and sunsets between `start` and `end`, in chronological order. */
export const getSunEvents = (
  start: Date,
  end: Date,
  latitude: number,
  longitude: number
): { type: "sunrise" | "sunset"; time: Date }[] => {
  const events: { type: "sunrise" | "sunset"; time: Date }[] = [];
  for (
    let dayStart = startOfDay(start);
    dayStart < end;
    dayStart = new Date(dayStart.getTime() + DAY_MS)
  ) {
    const { rise, set } = getSunTimes(dayStart, latitude, longitude);
    if (rise && rise >= start && rise <= end) {
      events.push({ type: "sunrise", time: rise });
    }
    if (set && set >= start && set <= end) {
      events.push({ type: "sunset", time: set });
    }
  }
  return events.sort((a, b) => a.time.getTime() - b.time.getTime());
};

export const getMoonTimes = (
  date: Date,
  latitude: number,
  longitude: number
): RiseSet =>
  findRiseSet(
    (d) => moonAltitude(d, latitude, longitude),
    MOON_HORIZON,
    startOfDay(date),
    endOfDay(date)
  );

export interface MoonIllumination {
  /** Illuminated fraction of the moon, 0 to 1 */
  fraction: number;
  /** Position in the lunar cycle: 0 new moon, 0.5 full moon, 1 new moon */
  phase: number;
}

export const getMoonIllumination = (date: Date): MoonIllumination => {
  const days = toDays(date);
  const sun = sunCoords(days);
  const moon = moonCoords(days);

  const elongation = Math.acos(
    Math.sin(sun.declination) * Math.sin(moon.declination) +
      Math.cos(sun.declination) *
        Math.cos(moon.declination) *
        Math.cos(sun.rightAscension - moon.rightAscension)
  );
  const inclination = Math.atan2(
    sun.distance * Math.sin(elongation),
    moon.distance - sun.distance * Math.cos(elongation)
  );
  const angle = Math.atan2(
    Math.cos(sun.declination) *
      Math.sin(sun.rightAscension - moon.rightAscension),
    Math.sin(sun.declination) * Math.cos(moon.declination) -
      Math.cos(sun.declination) *
        Math.sin(moon.declination) *
        Math.cos(sun.rightAscension - moon.rightAscension)
  );

  return {
    fraction: (1 + Math.cos(inclination)) / 2,
    phase: 0.5 + (0.5 * inclination * (angle < 0 ? -1 : 1)) / Math.PI,
  };
};

// Same boundaries as the moon integration in core (a 0 to 28 scale), so the
// computed phase matches the moon sensor.
export const moonPhaseName = (phase: number): MoonPhase => {
  const value = phase * 28;
  if (value < 0.5 || value > 27.5) {
    return "new_moon";
  }
  if (value < 6.5) {
    return "waxing_crescent";
  }
  if (value < 7.5) {
    return "first_quarter";
  }
  if (value < 13.5) {
    return "waxing_gibbous";
  }
  if (value < 14.5) {
    return "full_moon";
  }
  if (value < 20.5) {
    return "waning_gibbous";
  }
  if (value < 21.5) {
    return "last_quarter";
  }
  return "waning_crescent";
};

/** The next moment the moon is full, searched in steps of an hour. */
export const getNextFullMoon = (date: Date): Date => {
  const hour = 3600000;
  let time = date.getTime();
  let prev = getMoonIllumination(date).phase;
  for (let i = 0; i < 31 * 24; i++) {
    time += hour;
    const phase = getMoonIllumination(new Date(time)).phase;
    if (prev < 0.5 && phase >= 0.5) {
      return new Date(time);
    }
    prev = phase;
  }
  return new Date(date.getTime() + SYNODIC_MONTH * DAY_MS);
};
