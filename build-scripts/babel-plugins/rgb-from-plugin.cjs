module.exports = function rgbFromTransformPlugin({ types: t }) {
  return {
    name: "rgb-from-transform",
    visitor: {
      TaggedTemplateExpression(path) {
        // Only process css tagged templates
        if (!t.isIdentifier(path.node.tag, { name: "css" })) return;

        // Get build configuration from babel options
        const { latestBuild } = this.opts || {};

        // Only transform for legacy builds
        if (latestBuild) return;

        // Process each template literal part
        path.node.quasi.quasis.forEach((quasi) => {
          let css = quasi.value.raw;

          // Legacy build: rgb(from var(--color) r g b / 0.5) → rgba(var(--rgb-color), 0.5)
          css = css.replace(
            /rgb\(\s*from\s+var\((--[^)]+)\)\s+r\s+g\s+b\s*\/\s*([0-9.]+)\s*\)/g,
            (_, colorVar, opacity) => {
              const rgbVar = colorVar.replace("--", "--rgb-");
              return `rgba(var(${rgbVar}), ${opacity})`;
            }
          );

          if (css !== quasi.value.raw) {
            quasi.value.raw = quasi.value.cooked = css;
          }
        });
      },
    },
  };
};
