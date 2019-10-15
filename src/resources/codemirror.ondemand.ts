interface LoadedCodeMirror {
  codeMirror: any;
  codeMirrorCss: any;
}

let loaded: Promise<LoadedCodeMirror>;

export const loadCodeMirror = async (): Promise<LoadedCodeMirror> => {
  if (!loaded) {
    loaded = import(/* webpackChunkName: "codemirror" */ "./codemirror");
  }
  return loaded;
};
