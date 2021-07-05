let _ET;
let ET;
export default async function EventTarget() {
  return ET || init();
}
async function init() {
  _ET = window.EventTarget;
  try {
    new _ET();
  } catch (_a) {
    _ET = (await import("event-target-shim")).EventTarget;
  }
  return (ET = _ET);
}
//# sourceMappingURL=EventTarget.js.map
