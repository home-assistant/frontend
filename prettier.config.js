export default {
  trailingComma: "es5",
  overrides: [
    {
      files: "*.globals.ts",
      options: {
        printWidth: 9999, // Effectively disables line wrapping for these files
      },
    },
  ],
};
