// eslint-disable-next-line @typescript-eslint/naming-convention
const WebpackBar = require("webpackbar/rspack");

// Rspack 2's ProgressPlugin passes the third `info` arg as an object, but
// webpackbar@7's parseRequest assumes a string and crashes on `split`.
// Coerce non-string entries to "" before webpackbar sees them.
class SafeWebpackBar extends WebpackBar {
  constructor(options) {
    super(options);
    const inner = this.webpackbar;
    const originalUpdate = inner.updateProgress.bind(inner);
    inner.updateProgress = (percent, message, details = []) =>
      originalUpdate(
        percent,
        message,
        details.map((d) => (typeof d === "string" ? d : ""))
      );
  }
}

module.exports = SafeWebpackBar;
