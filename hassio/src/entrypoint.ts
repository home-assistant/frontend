window.loadES5Adapter().then(() => {
  // eslint-disable-next-line
  import(/* webpackChunkName: "roboto" */ "../../src/resources/roboto");
  // eslint-disable-next-line
  import(/* webpackChunkName: "hassio-icons" */ "./resources/hassio-icons");
  // eslint-disable-next-line
  import(/* webpackChunkName: "hassio-main" */ "./hassio-main");
});

const styleEl = document.createElement("style");
styleEl.innerHTML = `
body {
  font-family: Roboto, sans-serif;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-smoothing: antialiased;
  font-weight: 400;
  margin: 0;
  padding: 0;
  height: 100vh;
}
`;
document.head.appendChild(styleEl);
