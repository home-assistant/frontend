let loaded: Promise<typeof import("./codemirror")>;

export const loadCodeMirror = async (): Promise<
  typeof import("./codemirror")
> => {
  if (!loaded) {
    loaded = import("./codemirror");
  }
  return loaded;
};
