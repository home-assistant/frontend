const CleanCSS = require("clean-css");
const browserslist = require("browserslist");
const { transform, browserslistToTargets, Features } = require("lightningcss");

const cleanCSS = new CleanCSS({ compatibility: "*,-properties.zeroUnits" });
const decoder = new TextDecoder();
function wrapCSS(text, type) {
  if (type === "inline") return `#a{${text}}`;
  if (type === "media") return `@media ${text}{#a{top:0}}`;
  return text;
}
function unwrapCSS(text, type) {
  if (type === "inline") return text.match(/^#a ?\{([\s\S]*)\}$/m)[1];
  if (type === "media")
    return text.match(/^@media ?([\s\S]*?) ?{[\s\S]*}$/m)[1];
  return text;
}

module.exports.getMinifyCSS = ({ latestBuild, isProdBuild }) => {
  const cssTargets = browserslistToTargets(
    browserslist(
      browserslist.loadConfig({
        path: ".",
        env: latestBuild ? "modern" : "legacy",
      }),
      { throwOnMissing: true, mobileToDesktop: true }
    )
  );
  return (text, type) => {
    if (!text) return text;
    const input = wrapCSS(text, type);
    if (
      !text.includes("babel-plugin-template-html-minifier") &&
      !text.includes("@apply")
    ) {
      const { code, warnings: ws } = transform({
        filename: "style.css",
        code: Buffer.from(input),
        minify: isProdBuild,
        targets: cssTargets,
        exclude: Features.DirSelector,
      });
      const warnings = ws.filter(
        (w) => w.message !== "Unknown at rule: @apply"
      );
      if (warnings.length > 0) {
        console.warn("[LCSS] Warnings while transforming CSS:", ...warnings);
      }
      const lcss = decoder.decode(code);
      try {
        return unwrapCSS(lcss, type);
      } catch (e) {
        console.error("[LCSS] Invalid output", { text, type, output: lcss, e });
        return text;
      }
    }
    if (isProdBuild) {
      const { styles: ccss, errors, warnings } = cleanCSS.minify(input);
      if (errors.length > 0) {
        console.error("[CCSS] Errors while transforming CSS:", ...errors);
      }
      if (warnings.length > 0) {
        console.warn("[CCSS] Warnings while transforming CSS:", ...warnings);
      }
      try {
        return unwrapCSS(ccss, type);
      } catch (e) {
        console.error("[CCSS] Invalid output", { text, type, output: ccss, e });
        return text;
      }
    }
    return text;
  };
};
