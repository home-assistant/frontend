// Generates dist/custom-elements.json from the JSDoc of the hac elements, for
// editors and documentation tools. Only hac-*.ts files declare elements; the
// entry points just re-export them.

const forEachDeclaration = (customElementsManifest, callback) => {
  for (const module of customElementsManifest.modules) {
    for (const declaration of module.declarations ?? []) {
      callback(declaration);
    }
  }
};

// The analyzer leaves the readme empty. Paths in the manifest are relative to
// the package root, like the module paths.
const packageReadme = () => ({
  name: "package-readme",
  packageLinkPhase({ customElementsManifest }) {
    customElementsManifest.readme = "README.md";
  },
});

// Elements are documented with @summary, which the analyzer only puts into
// `summary`. Most tools show `description`, so fall back to the summary.
const summaryAsDescription = () => ({
  name: "summary-as-description",
  packageLinkPhase({ customElementsManifest }) {
    forEachDeclaration(customElementsManifest, (declaration) => {
      if (!declaration.description && declaration.summary) {
        declaration.description = declaration.summary;
      }
    });
  },
});

// Private and protected members are internal, so keep them out of the
// documented API.
const publicApiOnly = () => ({
  name: "public-api-only",
  packageLinkPhase({ customElementsManifest }) {
    forEachDeclaration(customElementsManifest, (declaration) => {
      declaration.members = declaration.members?.filter(
        (member) => !member.privacy || member.privacy === "public"
      );
    });
  },
});

export default {
  globs: ["src/components/**/hac-*.ts"],
  outdir: "dist",
  litelement: true,
  plugins: [packageReadme(), summaryAsDescription(), publicApiOnly()],
};
