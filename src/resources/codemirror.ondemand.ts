let loaded: typeof import("./codemirror");

export const loadCodeMirror = async (): Promise<
  typeof import("./codemirror")
> => {
  if (!loaded) {
    loaded = await import("./codemirror");
  }
  return loaded;
};
