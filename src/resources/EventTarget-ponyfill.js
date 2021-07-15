let ET;
export default async function EventTarget() {
  return ET || init();
}
async function init() {
  ET = window.EventTarget;
  try {
    // eslint-disable-next-line no-new
    new ET();
  } catch (_a) {
    // eslint-disable-next-line import/no-extraneous-dependencies
    ET = (await import("event-target-shim")).default.EventTarget;
  }
  return ET;
}
