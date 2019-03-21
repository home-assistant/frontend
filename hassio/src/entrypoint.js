window.loadES5Adapter().then(() => {
  import(/* webpackChunkName: "hassio-icons" */ "./resources/hassio-icons.js");
  import(/* webpackChunkName: "hassio-main" */ "./hassio-main.js");
});
document.body.style.height = "100%";
