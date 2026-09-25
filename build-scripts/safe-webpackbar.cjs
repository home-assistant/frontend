// eslint-disable-next-line @typescript-eslint/naming-convention
const WebpackBar = require("webpackbar/rspack");

// Rspack 2's ProgressPlugin passes the third `info` arg as
// `{ builtModules, moduleIdentifier? }` instead of the v1 string. webpackbar@7's
// parseRequest still expects a string and crashes on `split`. Extract
// moduleIdentifier (the v1 equivalent) so progress still shows the active module.
class SafeWebpackBar extends WebpackBar {
  constructor(options) {
    super(options);
    const inner = this.webpackbar;
    const originalUpdate = inner.updateProgress.bind(inner);
    inner.updateProgress = (percent, message, details = []) =>
      originalUpdate(
        percent,
        message,
        details.map((d) => {
          if (typeof d === "string") return d;
          return d?.moduleIdentifier ?? "";
        })
      );
  }
}

module.exports = SafeWebpackBar;
