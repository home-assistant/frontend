import fecha from "fecha";

// Check for support of native locale string options
function toLocaleDateStringSupportsOptions() {
  try {
    new Date().toLocaleDateString("i");
  } catch (e) {
    return e.name === "RangeError";
  }
  return false;
}

export default toLocaleDateStringSupportsOptions()
  ? (dateObj: Date, locales: string) =>
      dateObj.toLocaleDateString(locales, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
  : (dateObj: Date) => fecha.format(dateObj, "mediumDate");
