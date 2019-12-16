import fecha from "fecha";

// Check for support of native locale string options
function toLocaleTimeStringSupportsOptions() {
  try {
    new Date().toLocaleTimeString("i");
  } catch (e) {
    return e.name === "RangeError";
  }
  return false;
}

export default toLocaleTimeStringSupportsOptions()
  ? (dateObj: Date, locales: string) =>
      dateObj.toLocaleTimeString(locales, {
        hour: "numeric",
        minute: "2-digit",
      })
  : (dateObj: Date) => fecha.format(dateObj, "shortTime");
