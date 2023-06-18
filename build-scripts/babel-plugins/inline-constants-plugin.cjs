const path = require("path");

// Currently only supports CommonJS modules, as require is synchronous. `import` would need babel running asynchronous.
module.exports = function inlineConstants(babel, options, cwd) {
  const t = babel.types;

  if (!Array.isArray(options.modules)) {
    throw new TypeError(
      "babel-plugin-inline-constants: expected a `modules` array to be passed"
    );
  }

  if (options.resolveExtensions && !Array.isArray(options.resolveExtensions)) {
    throw new TypeError(
      "babel-plugin-inline-constants: expected `resolveExtensions` to be an array"
    );
  }

  const ignoreModuleNotFound = options.ignoreModuleNotFound;
  const resolveExtensions = options.resolveExtensions;

  const hasRelativeModules = options.modules.some(
    (module) => module.startsWith(".") || module.startsWith("/")
  );

  const modules = Object.fromEntries(
    options.modules.map((module) => {
      const absolute = module.startsWith(".")
        ? require.resolve(module, { paths: [cwd] })
        : module;
      return [absolute, require(absolute)];
    })
  );

  const toLiteral = (value) => {
    if (typeof value === "string") {
      return t.stringLiteral(value);
    }

    if (typeof value === "number") {
      return t.numericLiteral(value);
    }

    if (typeof value === "boolean") {
      return t.booleanLiteral(value);
    }

    if (value === null) {
      return t.nullLiteral();
    }

    throw new Error(
      "babel-plugin-inline-constants: cannot handle non-literal `" + value + "`"
    );
  };

  const resolveAbsolute = (value, state, resolveExtensionIndex) => {
    if (!state.filename) {
      throw new TypeError(
        "babel-plugin-inline-constants: expected a `filename` to be set for files"
      );
    }

    if (resolveExtensions && resolveExtensionIndex !== undefined) {
      value += resolveExtensions[resolveExtensionIndex];
    }

    try {
      return require.resolve(value, { paths: [path.dirname(state.filename)] });
    } catch (error) {
      if (
        error.code === "MODULE_NOT_FOUND" &&
        resolveExtensions &&
        (resolveExtensionIndex === undefined ||
          resolveExtensionIndex < resolveExtensions.length - 1)
      ) {
        const resolveExtensionIdx = (resolveExtensionIndex || -1) + 1;
        return resolveAbsolute(value, state, resolveExtensionIdx);
      }

      if (error.code === "MODULE_NOT_FOUND" && ignoreModuleNotFound) {
        return undefined;
      }
      throw error;
    }
  };

  const importDeclaration = (p, state) => {
    if (p.node.type !== "ImportDeclaration") {
      return;
    }
    const absolute =
      hasRelativeModules && p.node.source.value.startsWith(".")
        ? resolveAbsolute(p.node.source.value, state)
        : p.node.source.value;

    if (!absolute || !(absolute in modules)) {
      return;
    }

    const module = modules[absolute];

    for (const specifier of p.node.specifiers) {
      if (
        specifier.type === "ImportDefaultSpecifier" &&
        specifier.local &&
        specifier.local.type === "Identifier"
      ) {
        if (!("default" in module)) {
          throw new Error(
            "babel-plugin-inline-constants: cannot access default export from `" +
              p.node.source.value +
              "`"
          );
        }

        const variableValue = toLiteral(module.default);
        const variable = t.variableDeclarator(
          t.identifier(specifier.local.name),
          variableValue
        );

        p.insertBefore({
          type: "VariableDeclaration",
          kind: "const",
          declarations: [variable],
        });
      } else if (
        specifier.type === "ImportSpecifier" &&
        specifier.imported &&
        specifier.imported.type === "Identifier" &&
        specifier.local &&
        specifier.local.type === "Identifier"
      ) {
        if (!(specifier.imported.name in module)) {
          throw new Error(
            "babel-plugin-inline-constants: cannot access `" +
              specifier.imported.name +
              "` from `" +
              p.node.source.value +
              "`"
          );
        }

        const variableValue = toLiteral(module[specifier.imported.name]);
        const variable = t.variableDeclarator(
          t.identifier(specifier.local.name),
          variableValue
        );

        p.insertBefore({
          type: "VariableDeclaration",
          kind: "const",
          declarations: [variable],
        });
      } else {
        throw new Error("Cannot handle specifier `" + specifier.type + "`");
      }
    }
    p.remove();
  };

  return {
    visitor: {
      ImportDeclaration: importDeclaration,
    },
  };
};
