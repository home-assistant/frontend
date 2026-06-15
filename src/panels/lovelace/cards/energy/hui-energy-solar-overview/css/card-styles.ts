import { css, unsafeCSS } from "lit";
//MapLibre's stylesheet ships under dist/maplibre-gl.css. Vite's
//`?inline` query suffix returns the file content as a raw string
//instead of injecting a global <style> tag, we need the rules
//*inside* our shadow root, not in document <head>. Without these
//rules .maplibregl-canvas falls back to the default `position:
//static`, which makes the canvas participate in the layout flow:
//in HA panel-mode (where the parent container has no fixed
//height), the explicit pixel size MapLibre writes onto the canvas
//pushes the container, our ResizeObserver fires, MapLibre re-reads
//a bigger container, and we're in an unbounded growth loop. With
//the rule applied the canvas is taken out of flow and the loop
//breaks.
//
//Vite's `?inline` import is unavailable under Home Assistant's rspack build, so
//the stylesheet is vendored as the string constant below and prepended to the
//card stylesheet. Regenerate from node_modules/maplibre-gl/dist/maplibre-gl.css
//when the maplibre-gl dependency is bumped.

/* MapLibre overrides: vendored copy of maplibre-gl/dist/maplibre-gl.css */

const maplibreCss = `.maplibregl-map{font:12px/20px Helvetica Neue,Arial,Helvetica,sans-serif;overflow:hidden;position:relative;-webkit-tap-highlight-color:rgb(0 0 0/0)}.maplibregl-canvas{left:0;position:absolute;top:0}.maplibregl-map:fullscreen{height:100%;width:100%}.maplibregl-ctrl-group button.maplibregl-ctrl-compass{touch-action:none}.maplibregl-canvas-container.maplibregl-interactive,.maplibregl-ctrl-group button.maplibregl-ctrl-compass{cursor:grab;-webkit-user-select:none;-moz-user-select:none;user-select:none}.maplibregl-canvas-container.maplibregl-interactive.maplibregl-track-pointer{cursor:pointer}.maplibregl-canvas-container.maplibregl-interactive:active,.maplibregl-ctrl-group button.maplibregl-ctrl-compass:active{cursor:grabbing}.maplibregl-canvas-container.maplibregl-touch-zoom-rotate,.maplibregl-canvas-container.maplibregl-touch-zoom-rotate .maplibregl-canvas{touch-action:pan-x pan-y}.maplibregl-canvas-container.maplibregl-touch-drag-pan,.maplibregl-canvas-container.maplibregl-touch-drag-pan .maplibregl-canvas{touch-action:pinch-zoom}.maplibregl-canvas-container.maplibregl-touch-zoom-rotate.maplibregl-touch-drag-pan,.maplibregl-canvas-container.maplibregl-touch-zoom-rotate.maplibregl-touch-drag-pan .maplibregl-canvas{touch-action:none}.maplibregl-canvas-container.maplibregl-touch-drag-pan.maplibregl-cooperative-gestures,.maplibregl-canvas-container.maplibregl-touch-drag-pan.maplibregl-cooperative-gestures .maplibregl-canvas{touch-action:pan-x pan-y}.maplibregl-ctrl-bottom-left,.maplibregl-ctrl-bottom-right,.maplibregl-ctrl-top-left,.maplibregl-ctrl-top-right{pointer-events:none;position:absolute;z-index:2}.maplibregl-ctrl-top-left{left:0;top:0}.maplibregl-ctrl-top-right{right:0;top:0}.maplibregl-ctrl-bottom-left{bottom:0;left:0}.maplibregl-ctrl-bottom-right{bottom:0;right:0}.maplibregl-ctrl{clear:both;pointer-events:auto;transform:translate(0)}.maplibregl-ctrl-top-left .maplibregl-ctrl{float:left;margin:10px 0 0 10px}.maplibregl-ctrl-top-right .maplibregl-ctrl{float:right;margin:10px 10px 0 0}.maplibregl-ctrl-bottom-left .maplibregl-ctrl{float:left;margin:0 0 10px 10px}.maplibregl-ctrl-bottom-right .maplibregl-ctrl{float:right;margin:0 10px 10px 0}.maplibregl-ctrl-group{background:#fff;border-radius:4px}.maplibregl-ctrl-group:not(:empty){box-shadow:0 0 0 2px rgba(0,0,0,.1)}@media (forced-colors:active){.maplibregl-ctrl-group:not(:empty){box-shadow:0 0 0 2px ButtonText}}.maplibregl-ctrl-group button{background-color:transparent;border:0;box-sizing:border-box;cursor:pointer;display:block;height:29px;outline:none;padding:0;width:29px}.maplibregl-ctrl-group button+button{border-top:1px solid #ddd}.maplibregl-ctrl button .maplibregl-ctrl-icon{background-position:50%;background-repeat:no-repeat;display:block;height:100%;width:100%}@media (forced-colors:active){.maplibregl-ctrl-icon{background-color:transparent}.maplibregl-ctrl-group button+button{border-top:1px solid ButtonText}}.maplibregl-ctrl button::-moz-focus-inner{border:0;padding:0}.maplibregl-ctrl-attrib-button:focus,.maplibregl-ctrl-group button:focus{box-shadow:0 0 2px 2px #0096ff}.maplibregl-ctrl button:disabled{cursor:not-allowed}.maplibregl-ctrl button:disabled .maplibregl-ctrl-icon{opacity:.25}@media (hover:hover){.maplibregl-ctrl button:not(:disabled):hover{background-color:rgba(0,0,0,.05)}}.maplibregl-ctrl button:not(:disabled):active{background-color:rgba(0,0,0,.05)}.maplibregl-ctrl-group button:focus:focus-visible{box-shadow:0 0 2px 2px #0096ff}.maplibregl-ctrl-group button:focus:not(:focus-visible){box-shadow:none}.maplibregl-ctrl-group button:focus:first-child{border-radius:4px 4px 0 0}.maplibregl-ctrl-group button:focus:last-child{border-radius:0 0 4px 4px}.maplibregl-ctrl-group button:focus:only-child{border-radius:inherit}.maplibregl-ctrl button.maplibregl-ctrl-zoom-out .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' fill='%23333' viewBox='0 0 29 29'%3E%3Cpath d='M10 13c-.75 0-1.5.75-1.5 1.5S9.25 16 10 16h9c.75 0 1.5-.75 1.5-1.5S19.75 13 19 13z'/%3E%3C/svg%3E")}.maplibregl-ctrl button.maplibregl-ctrl-zoom-in .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' fill='%23333' viewBox='0 0 29 29'%3E%3Cpath d='M14.5 8.5c-.75 0-1.5.75-1.5 1.5v3h-3c-.75 0-1.5.75-1.5 1.5S9.25 16 10 16h3v3c0 .75.75 1.5 1.5 1.5S16 19.75 16 19v-3h3c.75 0 1.5-.75 1.5-1.5S19.75 13 19 13h-3v-3c0-.75-.75-1.5-1.5-1.5'/%3E%3C/svg%3E")}@media (forced-colors:active){.maplibregl-ctrl button.maplibregl-ctrl-zoom-out .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' fill='%23fff' viewBox='0 0 29 29'%3E%3Cpath d='M10 13c-.75 0-1.5.75-1.5 1.5S9.25 16 10 16h9c.75 0 1.5-.75 1.5-1.5S19.75 13 19 13z'/%3E%3C/svg%3E")}.maplibregl-ctrl button.maplibregl-ctrl-zoom-in .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' fill='%23fff' viewBox='0 0 29 29'%3E%3Cpath d='M14.5 8.5c-.75 0-1.5.75-1.5 1.5v3h-3c-.75 0-1.5.75-1.5 1.5S9.25 16 10 16h3v3c0 .75.75 1.5 1.5 1.5S16 19.75 16 19v-3h3c.75 0 1.5-.75 1.5-1.5S19.75 13 19 13h-3v-3c0-.75-.75-1.5-1.5-1.5'/%3E%3C/svg%3E")}}@media (forced-colors:active) and (prefers-color-scheme:light){.maplibregl-ctrl button.maplibregl-ctrl-zoom-out .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' viewBox='0 0 29 29'%3E%3Cpath d='M10 13c-.75 0-1.5.75-1.5 1.5S9.25 16 10 16h9c.75 0 1.5-.75 1.5-1.5S19.75 13 19 13z'/%3E%3C/svg%3E")}.maplibregl-ctrl button.maplibregl-ctrl-zoom-in .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' viewBox='0 0 29 29'%3E%3Cpath d='M14.5 8.5c-.75 0-1.5.75-1.5 1.5v3h-3c-.75 0-1.5.75-1.5 1.5S9.25 16 10 16h3v3c0 .75.75 1.5 1.5 1.5S16 19.75 16 19v-3h3c.75 0 1.5-.75 1.5-1.5S19.75 13 19 13h-3v-3c0-.75-.75-1.5-1.5-1.5'/%3E%3C/svg%3E")}}.maplibregl-ctrl button.maplibregl-ctrl-fullscreen .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' fill='%23333' viewBox='0 0 29 29'%3E%3Cpath d='M24 16v5.5c0 1.75-.75 2.5-2.5 2.5H16v-1l3-1.5-4-5.5 1-1 5.5 4 1.5-3zM6 16l1.5 3 5.5-4 1 1-4 5.5 3 1.5v1H7.5C5.75 24 5 23.25 5 21.5V16zm7-11v1l-3 1.5 4 5.5-1 1-5.5-4L6 13H5V7.5C5 5.75 5.75 5 7.5 5zm11 2.5c0-1.75-.75-2.5-2.5-2.5H16v1l3 1.5-4 5.5 1 1 5.5-4 1.5 3h1z'/%3E%3C/svg%3E")}.maplibregl-ctrl button.maplibregl-ctrl-shrink .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' viewBox='0 0 29 29'%3E%3Cpath d='M18.5 16c-1.75 0-2.5.75-2.5 2.5V24h1l1.5-3 5.5 4 1-1-4-5.5 3-1.5v-1zM13 18.5c0-1.75-.75-2.5-2.5-2.5H5v1l3 1.5L4 24l1 1 5.5-4 1.5 3h1zm3-8c0 1.75.75 2.5 2.5 2.5H24v-1l-3-1.5L25 5l-1-1-5.5 4L17 5h-1zM10.5 13c1.75 0 2.5-.75 2.5-2.5V5h-1l-1.5 3L5 4 4 5l4 5.5L5 12v1z'/%3E%3C/svg%3E")}@media (forced-colors:active){.maplibregl-ctrl button.maplibregl-ctrl-fullscreen .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' fill='%23fff' viewBox='0 0 29 29'%3E%3Cpath d='M24 16v5.5c0 1.75-.75 2.5-2.5 2.5H16v-1l3-1.5-4-5.5 1-1 5.5 4 1.5-3zM6 16l1.5 3 5.5-4 1 1-4 5.5 3 1.5v1H7.5C5.75 24 5 23.25 5 21.5V16zm7-11v1l-3 1.5 4 5.5-1 1-5.5-4L6 13H5V7.5C5 5.75 5.75 5 7.5 5zm11 2.5c0-1.75-.75-2.5-2.5-2.5H16v1l3 1.5-4 5.5 1 1 5.5-4 1.5 3h1z'/%3E%3C/svg%3E")}.maplibregl-ctrl button.maplibregl-ctrl-shrink .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' fill='%23fff' viewBox='0 0 29 29'%3E%3Cpath d='M18.5 16c-1.75 0-2.5.75-2.5 2.5V24h1l1.5-3 5.5 4 1-1-4-5.5 3-1.5v-1zM13 18.5c0-1.75-.75-2.5-2.5-2.5H5v1l3 1.5L4 24l1 1 5.5-4 1.5 3h1zm3-8c0 1.75.75 2.5 2.5 2.5H24v-1l-3-1.5L25 5l-1-1-5.5 4L17 5h-1zM10.5 13c1.75 0 2.5-.75 2.5-2.5V5h-1l-1.5 3L5 4 4 5l4 5.5L5 12v1z'/%3E%3C/svg%3E")}}@media (forced-colors:active) and (prefers-color-scheme:light){.maplibregl-ctrl button.maplibregl-ctrl-fullscreen .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' viewBox='0 0 29 29'%3E%3Cpath d='M24 16v5.5c0 1.75-.75 2.5-2.5 2.5H16v-1l3-1.5-4-5.5 1-1 5.5 4 1.5-3zM6 16l1.5 3 5.5-4 1 1-4 5.5 3 1.5v1H7.5C5.75 24 5 23.25 5 21.5V16zm7-11v1l-3 1.5 4 5.5-1 1-5.5-4L6 13H5V7.5C5 5.75 5.75 5 7.5 5zm11 2.5c0-1.75-.75-2.5-2.5-2.5H16v1l3 1.5-4 5.5 1 1 5.5-4 1.5 3h1z'/%3E%3C/svg%3E")}.maplibregl-ctrl button.maplibregl-ctrl-shrink .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' viewBox='0 0 29 29'%3E%3Cpath d='M18.5 16c-1.75 0-2.5.75-2.5 2.5V24h1l1.5-3 5.5 4 1-1-4-5.5 3-1.5v-1zM13 18.5c0-1.75-.75-2.5-2.5-2.5H5v1l3 1.5L4 24l1 1 5.5-4 1.5 3h1zm3-8c0 1.75.75 2.5 2.5 2.5H24v-1l-3-1.5L25 5l-1-1-5.5 4L17 5h-1zM10.5 13c1.75 0 2.5-.75 2.5-2.5V5h-1l-1.5 3L5 4 4 5l4 5.5L5 12v1z'/%3E%3C/svg%3E")}}.maplibregl-ctrl button.maplibregl-ctrl-compass .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' fill='%23333' viewBox='0 0 29 29'%3E%3Cpath d='m10.5 14 4-8 4 8z'/%3E%3Cpath fill='%23ccc' d='m10.5 16 4 8 4-8z'/%3E%3C/svg%3E")}@media (forced-colors:active){.maplibregl-ctrl button.maplibregl-ctrl-compass .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' fill='%23fff' viewBox='0 0 29 29'%3E%3Cpath d='m10.5 14 4-8 4 8z'/%3E%3Cpath fill='%23ccc' d='m10.5 16 4 8 4-8z'/%3E%3C/svg%3E")}}@media (forced-colors:active) and (prefers-color-scheme:light){.maplibregl-ctrl button.maplibregl-ctrl-compass .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' viewBox='0 0 29 29'%3E%3Cpath d='m10.5 14 4-8 4 8z'/%3E%3Cpath fill='%23ccc' d='m10.5 16 4 8 4-8z'/%3E%3C/svg%3E")}}.maplibregl-ctrl button.maplibregl-ctrl-globe .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22' fill='none' stroke='%23333' viewBox='0 0 22 22'%3E%3Ccircle cx='11' cy='11' r='8.5'/%3E%3Cpath d='M17.5 11c0 4.819-3.02 8.5-6.5 8.5S4.5 15.819 4.5 11 7.52 2.5 11 2.5s6.5 3.681 6.5 8.5Z'/%3E%3Cpath d='M13.5 11c0 2.447-.331 4.64-.853 6.206-.262.785-.562 1.384-.872 1.777-.314.399-.58.517-.775.517s-.461-.118-.775-.517c-.31-.393-.61-.992-.872-1.777C8.831 15.64 8.5 13.446 8.5 11s.331-4.64.853-6.206c.262-.785.562-1.384.872-1.777.314-.399.58-.517.775-.517s.461.118.775.517c.31.393.61.992.872 1.777.522 1.565.853 3.76.853 6.206Z'/%3E%3Cpath d='M11 7.5c-1.909 0-3.622-.166-4.845-.428-.616-.132-1.08-.283-1.379-.434a1.3 1.3 0 0 1-.224-.138q.07-.058.224-.138c.299-.151.763-.302 1.379-.434C7.378 5.666 9.091 5.5 11 5.5s3.622.166 4.845.428c.616.132 1.08.283 1.379.434.105.053.177.1.224.138q-.07.058-.224.138c-.299.151-.763.302-1.379.434-1.223.262-2.936.428-4.845.428ZM4.486 6.436ZM11 16.5c-1.909 0-3.622-.166-4.845-.428-.616-.132-1.08-.283-1.379-.434a1.3 1.3 0 0 1-.224-.138 1.3 1.3 0 0 1 .224-.138c.299-.151.763-.302 1.379-.434C7.378 14.666 9.091 14.5 11 14.5s3.622.166 4.845.428c.616.132 1.08.283 1.379.434.105.053.177.1.224.138a1.3 1.3 0 0 1-.224.138c-.299.151-.763.302-1.379.434-1.223.262-2.936.428-4.845.428Zm-6.514-1.064ZM11 12.5c-2.46 0-4.672-.222-6.255-.574-.796-.177-1.406-.38-1.805-.59a1.5 1.5 0 0 1-.39-.272.3.3 0 0 1-.047-.064.3.3 0 0 1 .048-.064c.066-.073.189-.167.389-.272.399-.21 1.009-.413 1.805-.59C6.328 9.722 8.54 9.5 11 9.5s4.672.222 6.256.574c.795.177 1.405.38 1.804.59.2.105.323.2.39.272a.3.3 0 0 1 .047.064.3.3 0 0 1-.048.064 1.4 1.4 0 0 1-.389.272c-.399.21-1.009.413-1.804.59-1.584.352-3.796.574-6.256.574Zm-8.501-1.51v.002zm0 .018v.002zm17.002.002v-.002zm0-.018v-.002z'/%3E%3C/svg%3E")}.maplibregl-ctrl button.maplibregl-ctrl-globe-enabled .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22' fill='none' stroke='%2333b5e5' viewBox='0 0 22 22'%3E%3Ccircle cx='11' cy='11' r='8.5'/%3E%3Cpath d='M17.5 11c0 4.819-3.02 8.5-6.5 8.5S4.5 15.819 4.5 11 7.52 2.5 11 2.5s6.5 3.681 6.5 8.5Z'/%3E%3Cpath d='M13.5 11c0 2.447-.331 4.64-.853 6.206-.262.785-.562 1.384-.872 1.777-.314.399-.58.517-.775.517s-.461-.118-.775-.517c-.31-.393-.61-.992-.872-1.777C8.831 15.64 8.5 13.446 8.5 11s.331-4.64.853-6.206c.262-.785.562-1.384.872-1.777.314-.399.58-.517.775-.517s.461.118.775.517c.31.393.61.992.872 1.777.522 1.565.853 3.76.853 6.206Z'/%3E%3Cpath d='M11 7.5c-1.909 0-3.622-.166-4.845-.428-.616-.132-1.08-.283-1.379-.434a1.3 1.3 0 0 1-.224-.138q.07-.058.224-.138c.299-.151.763-.302 1.379-.434C7.378 5.666 9.091 5.5 11 5.5s3.622.166 4.845.428c.616.132 1.08.283 1.379.434.105.053.177.1.224.138q-.07.058-.224.138c-.299.151-.763.302-1.379.434-1.223.262-2.936.428-4.845.428ZM4.486 6.436ZM11 16.5c-1.909 0-3.622-.166-4.845-.428-.616-.132-1.08-.283-1.379-.434a1.3 1.3 0 0 1-.224-.138 1.3 1.3 0 0 1 .224-.138c.299-.151.763-.302 1.379-.434C7.378 14.666 9.091 14.5 11 14.5s3.622.166 4.845.428c.616.132 1.08.283 1.379.434.105.053.177.1.224.138a1.3 1.3 0 0 1-.224.138c-.299.151-.763.302-1.379.434-1.223.262-2.936.428-4.845.428Zm-6.514-1.064ZM11 12.5c-2.46 0-4.672-.222-6.255-.574-.796-.177-1.406-.38-1.805-.59a1.5 1.5 0 0 1-.39-.272.3.3 0 0 1-.047-.064.3.3 0 0 1 .048-.064c.066-.073.189-.167.389-.272.399-.21 1.009-.413 1.805-.59C6.328 9.722 8.54 9.5 11 9.5s4.672.222 6.256.574c.795.177 1.405.38 1.804.59.2.105.323.2.39.272a.3.3 0 0 1 .047.064.3.3 0 0 1-.048.064 1.4 1.4 0 0 1-.389.272c-.399.21-1.009.413-1.804.59-1.584.352-3.796.574-6.256.574Zm-8.501-1.51v.002zm0 .018v.002zm17.002.002v-.002zm0-.018v-.002z'/%3E%3C/svg%3E")}.maplibregl-ctrl button.maplibregl-ctrl-terrain .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22' fill='%23333' viewBox='0 0 22 22'%3E%3Cpath d='m1.754 13.406 4.453-4.851 3.09 3.09 3.281 3.277.969-.969-3.309-3.312 3.844-4.121 6.148 6.886h1.082v-.855l-7.207-8.07-4.84 5.187L6.169 6.57l-5.48 5.965v.871ZM.688 16.844h20.625v1.375H.688Zm0 0'/%3E%3C/svg%3E")}.maplibregl-ctrl button.maplibregl-ctrl-terrain-enabled .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22' fill='%2333b5e5' viewBox='0 0 22 22'%3E%3Cpath d='m1.754 13.406 4.453-4.851 3.09 3.09 3.281 3.277.969-.969-3.309-3.312 3.844-4.121 6.148 6.886h1.082v-.855l-7.207-8.07-4.84 5.187L6.169 6.57l-5.48 5.965v.871ZM.688 16.844h20.625v1.375H.688Zm0 0'/%3E%3C/svg%3E")}.maplibregl-ctrl button.maplibregl-ctrl-geolocate .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' fill='%23333' viewBox='0 0 20 20'%3E%3Cpath d='M10 4C9 4 9 5 9 5v.1A5 5 0 0 0 5.1 9H5s-1 0-1 1 1 1 1 1h.1A5 5 0 0 0 9 14.9v.1s0 1 1 1 1-1 1-1v-.1a5 5 0 0 0 3.9-3.9h.1s1 0 1-1-1-1-1-1h-.1A5 5 0 0 0 11 5.1V5s0-1-1-1m0 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 1 1 0-7'/%3E%3Ccircle cx='10' cy='10' r='2'/%3E%3C/svg%3E")}.maplibregl-ctrl button.maplibregl-ctrl-geolocate:disabled .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' fill='%23aaa' viewBox='0 0 20 20'%3E%3Cpath d='M10 4C9 4 9 5 9 5v.1A5 5 0 0 0 5.1 9H5s-1 0-1 1 1 1 1 1h.1A5 5 0 0 0 9 14.9v.1s0 1 1 1 1-1 1-1v-.1a5 5 0 0 0 3.9-3.9h.1s1 0 1-1-1-1-1-1h-.1A5 5 0 0 0 11 5.1V5s0-1-1-1m0 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 1 1 0-7'/%3E%3Ccircle cx='10' cy='10' r='2'/%3E%3Cpath fill='red' d='m14 5 1 1-9 9-1-1z'/%3E%3C/svg%3E")}.maplibregl-ctrl button.maplibregl-ctrl-geolocate.maplibregl-ctrl-geolocate-active .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' fill='%2333b5e5' viewBox='0 0 20 20'%3E%3Cpath d='M10 4C9 4 9 5 9 5v.1A5 5 0 0 0 5.1 9H5s-1 0-1 1 1 1 1 1h.1A5 5 0 0 0 9 14.9v.1s0 1 1 1 1-1 1-1v-.1a5 5 0 0 0 3.9-3.9h.1s1 0 1-1-1-1-1-1h-.1A5 5 0 0 0 11 5.1V5s0-1-1-1m0 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 1 1 0-7'/%3E%3Ccircle cx='10' cy='10' r='2'/%3E%3C/svg%3E")}.maplibregl-ctrl button.maplibregl-ctrl-geolocate.maplibregl-ctrl-geolocate-active-error .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' fill='%23e58978' viewBox='0 0 20 20'%3E%3Cpath d='M10 4C9 4 9 5 9 5v.1A5 5 0 0 0 5.1 9H5s-1 0-1 1 1 1 1 1h.1A5 5 0 0 0 9 14.9v.1s0 1 1 1 1-1 1-1v-.1a5 5 0 0 0 3.9-3.9h.1s1 0 1-1-1-1-1-1h-.1A5 5 0 0 0 11 5.1V5s0-1-1-1m0 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 1 1 0-7'/%3E%3Ccircle cx='10' cy='10' r='2'/%3E%3C/svg%3E")}.maplibregl-ctrl button.maplibregl-ctrl-geolocate.maplibregl-ctrl-geolocate-background .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' fill='%2333b5e5' viewBox='0 0 20 20'%3E%3Cpath d='M10 4C9 4 9 5 9 5v.1A5 5 0 0 0 5.1 9H5s-1 0-1 1 1 1 1 1h.1A5 5 0 0 0 9 14.9v.1s0 1 1 1 1-1 1-1v-.1a5 5 0 0 0 3.9-3.9h.1s1 0 1-1-1-1-1-1h-.1A5 5 0 0 0 11 5.1V5s0-1-1-1m0 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 1 1 0-7'/%3E%3C/svg%3E")}.maplibregl-ctrl button.maplibregl-ctrl-geolocate.maplibregl-ctrl-geolocate-background-error .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' fill='%23e54e33' viewBox='0 0 20 20'%3E%3Cpath d='M10 4C9 4 9 5 9 5v.1A5 5 0 0 0 5.1 9H5s-1 0-1 1 1 1 1 1h.1A5 5 0 0 0 9 14.9v.1s0 1 1 1 1-1 1-1v-.1a5 5 0 0 0 3.9-3.9h.1s1 0 1-1-1-1-1-1h-.1A5 5 0 0 0 11 5.1V5s0-1-1-1m0 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 1 1 0-7'/%3E%3C/svg%3E")}.maplibregl-ctrl button.maplibregl-ctrl-geolocate.maplibregl-ctrl-geolocate-waiting .maplibregl-ctrl-icon{animation:maplibregl-spin 2s linear infinite}@media (forced-colors:active){.maplibregl-ctrl button.maplibregl-ctrl-geolocate .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' fill='%23fff' viewBox='0 0 20 20'%3E%3Cpath d='M10 4C9 4 9 5 9 5v.1A5 5 0 0 0 5.1 9H5s-1 0-1 1 1 1 1 1h.1A5 5 0 0 0 9 14.9v.1s0 1 1 1 1-1 1-1v-.1a5 5 0 0 0 3.9-3.9h.1s1 0 1-1-1-1-1-1h-.1A5 5 0 0 0 11 5.1V5s0-1-1-1m0 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 1 1 0-7'/%3E%3Ccircle cx='10' cy='10' r='2'/%3E%3C/svg%3E")}.maplibregl-ctrl button.maplibregl-ctrl-geolocate:disabled .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' fill='%23999' viewBox='0 0 20 20'%3E%3Cpath d='M10 4C9 4 9 5 9 5v.1A5 5 0 0 0 5.1 9H5s-1 0-1 1 1 1 1 1h.1A5 5 0 0 0 9 14.9v.1s0 1 1 1 1-1 1-1v-.1a5 5 0 0 0 3.9-3.9h.1s1 0 1-1-1-1-1-1h-.1A5 5 0 0 0 11 5.1V5s0-1-1-1m0 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 1 1 0-7'/%3E%3Ccircle cx='10' cy='10' r='2'/%3E%3Cpath fill='red' d='m14 5 1 1-9 9-1-1z'/%3E%3C/svg%3E")}.maplibregl-ctrl button.maplibregl-ctrl-geolocate.maplibregl-ctrl-geolocate-active .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' fill='%2333b5e5' viewBox='0 0 20 20'%3E%3Cpath d='M10 4C9 4 9 5 9 5v.1A5 5 0 0 0 5.1 9H5s-1 0-1 1 1 1 1 1h.1A5 5 0 0 0 9 14.9v.1s0 1 1 1 1-1 1-1v-.1a5 5 0 0 0 3.9-3.9h.1s1 0 1-1-1-1-1-1h-.1A5 5 0 0 0 11 5.1V5s0-1-1-1m0 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 1 1 0-7'/%3E%3Ccircle cx='10' cy='10' r='2'/%3E%3C/svg%3E")}.maplibregl-ctrl button.maplibregl-ctrl-geolocate.maplibregl-ctrl-geolocate-active-error .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' fill='%23e58978' viewBox='0 0 20 20'%3E%3Cpath d='M10 4C9 4 9 5 9 5v.1A5 5 0 0 0 5.1 9H5s-1 0-1 1 1 1 1 1h.1A5 5 0 0 0 9 14.9v.1s0 1 1 1 1-1 1-1v-.1a5 5 0 0 0 3.9-3.9h.1s1 0 1-1-1-1-1-1h-.1A5 5 0 0 0 11 5.1V5s0-1-1-1m0 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 1 1 0-7'/%3E%3Ccircle cx='10' cy='10' r='2'/%3E%3C/svg%3E")}.maplibregl-ctrl button.maplibregl-ctrl-geolocate.maplibregl-ctrl-geolocate-background .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' fill='%2333b5e5' viewBox='0 0 20 20'%3E%3Cpath d='M10 4C9 4 9 5 9 5v.1A5 5 0 0 0 5.1 9H5s-1 0-1 1 1 1 1 1h.1A5 5 0 0 0 9 14.9v.1s0 1 1 1 1-1 1-1v-.1a5 5 0 0 0 3.9-3.9h.1s1 0 1-1-1-1-1-1h-.1A5 5 0 0 0 11 5.1V5s0-1-1-1m0 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 1 1 0-7'/%3E%3C/svg%3E")}.maplibregl-ctrl button.maplibregl-ctrl-geolocate.maplibregl-ctrl-geolocate-background-error .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' fill='%23e54e33' viewBox='0 0 20 20'%3E%3Cpath d='M10 4C9 4 9 5 9 5v.1A5 5 0 0 0 5.1 9H5s-1 0-1 1 1 1 1 1h.1A5 5 0 0 0 9 14.9v.1s0 1 1 1 1-1 1-1v-.1a5 5 0 0 0 3.9-3.9h.1s1 0 1-1-1-1-1-1h-.1A5 5 0 0 0 11 5.1V5s0-1-1-1m0 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 1 1 0-7'/%3E%3C/svg%3E")}}@media (forced-colors:active) and (prefers-color-scheme:light){.maplibregl-ctrl button.maplibregl-ctrl-geolocate .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' viewBox='0 0 20 20'%3E%3Cpath d='M10 4C9 4 9 5 9 5v.1A5 5 0 0 0 5.1 9H5s-1 0-1 1 1 1 1 1h.1A5 5 0 0 0 9 14.9v.1s0 1 1 1 1-1 1-1v-.1a5 5 0 0 0 3.9-3.9h.1s1 0 1-1-1-1-1-1h-.1A5 5 0 0 0 11 5.1V5s0-1-1-1m0 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 1 1 0-7'/%3E%3Ccircle cx='10' cy='10' r='2'/%3E%3C/svg%3E")}.maplibregl-ctrl button.maplibregl-ctrl-geolocate:disabled .maplibregl-ctrl-icon{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' fill='%23666' viewBox='0 0 20 20'%3E%3Cpath d='M10 4C9 4 9 5 9 5v.1A5 5 0 0 0 5.1 9H5s-1 0-1 1 1 1 1 1h.1A5 5 0 0 0 9 14.9v.1s0 1 1 1 1-1 1-1v-.1a5 5 0 0 0 3.9-3.9h.1s1 0 1-1-1-1-1-1h-.1A5 5 0 0 0 11 5.1V5s0-1-1-1m0 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 1 1 0-7'/%3E%3Ccircle cx='10' cy='10' r='2'/%3E%3Cpath fill='red' d='m14 5 1 1-9 9-1-1z'/%3E%3C/svg%3E")}}@keyframes maplibregl-spin{0%{transform:rotate(0deg)}to{transform:rotate(1turn)}}a.maplibregl-ctrl-logo{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='88' height='23' fill='none'%3E%3Cpath fill='%23000' fill-opacity='.4' fill-rule='evenodd' d='M17.408 16.796h-1.827l2.501-12.095h.198l3.324 6.533.988 2.19.988-2.19 3.258-6.533h.181l2.6 12.095h-1.81l-1.218-5.644-.362-1.71-.658 1.71-2.929 5.644h-.098l-2.914-5.644-.757-1.71-.345 1.71zm1.958-3.42-.726 3.663a1.255 1.255 0 0 1-1.232 1.011h-1.827a1.255 1.255 0 0 1-1.229-1.509l2.501-12.095a1.255 1.255 0 0 1 1.23-1.001h.197a1.25 1.25 0 0 1 1.12.685l3.19 6.273 3.125-6.263a1.25 1.25 0 0 1 1.123-.695h.181a1.255 1.255 0 0 1 1.227.991l1.443 6.71a5 5 0 0 1 .314-.787l.009-.016a4.6 4.6 0 0 1 1.777-1.887c.782-.46 1.668-.667 2.611-.667a4.6 4.6 0 0 1 1.7.32l.306.134c.21-.16.474-.256.759-.256h1.694a1.255 1.255 0 0 1 1.212.925 1.255 1.255 0 0 1 1.212-.925h1.711c.284 0 .545.094.755.252.613-.3 1.312-.45 2.075-.45 1.356 0 2.557.445 3.482 1.4q.47.48.763 1.064V4.701a1.255 1.255 0 0 1 1.255-1.255h1.86A1.255 1.255 0 0 1 54.44 4.7v9.194h2.217c.19 0 .37.043.532.118v-4.77c0-.356.147-.678.385-.906a2.42 2.42 0 0 1-.682-1.71c0-.665.267-1.253.735-1.7a2.45 2.45 0 0 1 1.722-.674 2.43 2.43 0 0 1 1.705.675q.318.302.504.683V4.7a1.255 1.255 0 0 1 1.255-1.255h1.744A1.255 1.255 0 0 1 65.812 4.7v3.335a4.8 4.8 0 0 1 1.526-.246c.938 0 1.817.214 2.59.69a4.47 4.47 0 0 1 1.67 1.743v-.98a1.255 1.255 0 0 1 1.256-1.256h1.777c.233 0 .451.064.639.174a3.4 3.4 0 0 1 1.567-.372c.346 0 .861.02 1.285.232a1.25 1.25 0 0 1 .689 1.004 4.7 4.7 0 0 1 .853-.588c.795-.44 1.675-.647 2.61-.647 1.385 0 2.65.39 3.525 1.396.836.938 1.168 2.173 1.168 3.528q-.001.515-.056 1.051a1.255 1.255 0 0 1-.947 1.09l.408.952a1.255 1.255 0 0 1-.477 1.552c-.418.268-.92.463-1.458.612-.613.171-1.304.244-2.049.244-1.06 0-2.043-.207-2.886-.698l-.015-.008c-.798-.48-1.419-1.135-1.818-1.963l-.004-.008a5.8 5.8 0 0 1-.548-2.512q0-.429.053-.843a1.3 1.3 0 0 1-.333-.086l-.166-.004c-.223 0-.426.062-.643.228-.03.024-.142.139-.142.59v3.883a1.255 1.255 0 0 1-1.256 1.256h-1.777a1.255 1.255 0 0 1-1.256-1.256V15.69l-.032.057a4.8 4.8 0 0 1-1.86 1.833 5.04 5.04 0 0 1-2.484.634 4.5 4.5 0 0 1-1.935-.424 1.25 1.25 0 0 1-.764.258h-1.71a1.255 1.255 0 0 1-1.256-1.255V7.687a2.4 2.4 0 0 1-.428.625c.253.23.412.561.412.93v7.553a1.255 1.255 0 0 1-1.256 1.255h-1.843a1.25 1.25 0 0 1-.894-.373c-.228.23-.544.373-.894.373H51.32a1.255 1.255 0 0 1-1.256-1.255v-1.251l-.061.117a4.7 4.7 0 0 1-1.782 1.884 4.77 4.77 0 0 1-2.485.67 5.6 5.6 0 0 1-1.485-.188l.009 2.764a1.255 1.255 0 0 1-1.255 1.259h-1.729a1.255 1.255 0 0 1-1.255-1.255v-3.537a1.255 1.255 0 0 1-1.167.793h-1.679a1.25 1.25 0 0 1-.77-.263 4.5 4.5 0 0 1-1.945.429c-.885 0-1.724-.21-2.495-.632l-.017-.01a5 5 0 0 1-1.081-.836 1.255 1.255 0 0 1-1.254 1.312h-1.81a1.255 1.255 0 0 1-1.228-.99l-.782-3.625-2.044 3.939a1.25 1.25 0 0 1-1.115.676h-.098a1.25 1.25 0 0 1-1.116-.68l-2.061-3.994zM35.92 16.63l.207-.114.223-.15q.493-.356.735-.785l.061-.118.033 1.332h1.678V9.242h-1.694l-.033 1.267q-.133-.329-.526-.658l-.032-.028a3.2 3.2 0 0 0-.668-.428l-.27-.12a3.3 3.3 0 0 0-1.235-.23q-1.136-.001-1.974.493a3.36 3.36 0 0 0-1.3 1.382q-.445.89-.444 2.074 0 1.2.51 2.107a3.8 3.8 0 0 0 1.382 1.381 3.9 3.9 0 0 0 1.893.477q.795 0 1.455-.33zm-2.789-5.38q-.576.675-.575 1.762 0 1.102.559 1.794.576.675 1.645.675a2.25 2.25 0 0 0 .934-.19 2.2 2.2 0 0 0 .468-.29l.178-.161a2.2 2.2 0 0 0 .397-.561q.244-.5.244-1.15v-.115q0-.708-.296-1.267l-.043-.077a2.2 2.2 0 0 0-.633-.709l-.13-.086-.047-.028a2.1 2.1 0 0 0-1.073-.285q-1.052 0-1.629.692zm2.316 2.706c.163-.17.28-.407.28-.83v-.114c0-.292-.06-.508-.15-.68a.96.96 0 0 0-.353-.389.85.85 0 0 0-.464-.127c-.4 0-.56.114-.664.239l-.01.012c-.148.174-.275.45-.275.945 0 .506.122.801.27.99.097.11.266.224.68.224.303 0 .504-.09.687-.269zm7.545 1.705a2.6 2.6 0 0 0 .331.423q.319.33.755.548l.173.074q.65.255 1.49.255 1.02 0 1.844-.493a3.45 3.45 0 0 0 1.316-1.4q.493-.904.493-2.089 0-1.909-.988-2.913-.988-1.02-2.584-1.02-.898 0-1.575.347a3 3 0 0 0-.415.262l-.199.166a3.4 3.4 0 0 0-.64.82V9.242h-1.712v11.553h1.729l-.017-5.134zm.53-1.138q.206.29.48.5l.155.11.053.034q.51.296 1.119.297 1.07 0 1.645-.675.577-.69.576-1.762 0-1.119-.576-1.777-.558-.675-1.645-.675-.435 0-.835.16a2 2 0 0 0-.284.136 2 2 0 0 0-.363.254 2.2 2.2 0 0 0-.46.569l-.082.162a2.6 2.6 0 0 0-.213 1.072v.115q0 .707.296 1.267l.135.211zm.964-.818a1.1 1.1 0 0 0 .367.385.94.94 0 0 0 .476.118c.423 0 .59-.117.687-.23.159-.194.28-.478.28-.95 0-.53-.133-.8-.266-.952l-.021-.025c-.078-.094-.231-.221-.68-.221a1 1 0 0 0-.503.135l-.012.007a.86.86 0 0 0-.335.343c-.073.133-.132.324-.132.614v.115a1.4 1.4 0 0 0 .14.66zm15.7-6.222q.347-.346.346-.856a1.05 1.05 0 0 0-.345-.79 1.18 1.18 0 0 0-.84-.329q-.51 0-.855.33a1.05 1.05 0 0 0-.346.79q0 .51.346.855.345.346.856.346.51 0 .839-.346zm4.337 9.314.033-1.332q.191.403.59.747l.098.081a4 4 0 0 0 .316.224l.223.122a3.2 3.2 0 0 0 1.44.322 3.8 3.8 0 0 0 1.875-.477 3.5 3.5 0 0 0 1.382-1.366q.527-.89.526-2.09 0-1.184-.444-2.073a3.24 3.24 0 0 0-1.283-1.399q-.823-.51-1.942-.51a3.5 3.5 0 0 0-1.527.344l-.086.043-.165.09a3 3 0 0 0-.33.214q-.432.315-.656.707a2 2 0 0 0-.099.198l.082-1.283V4.701h-1.744v12.095zm.473-2.509a2.5 2.5 0 0 0 .566.7q.117.098.245.18l.144.08a2.1 2.1 0 0 0 .975.232q1.07 0 1.645-.675.576-.69.576-1.778 0-1.102-.576-1.777-.56-.691-1.645-.692a2.2 2.2 0 0 0-1.015.235q-.22.113-.415.282l-.15.142a2.1 2.1 0 0 0-.42.594q-.223.479-.223 1.1v.115q0 .705.293 1.26zm2.616-.293c.157-.191.28-.479.28-.967 0-.51-.13-.79-.276-.961l-.021-.026c-.082-.1-.232-.225-.67-.225a.87.87 0 0 0-.681.279l-.012.011c-.154.155-.274.38-.274.807v.115c0 .285.057.499.144.669a1.1 1.1 0 0 0 .367.405c.137.082.28.123.455.123.423 0 .59-.118.686-.23zm8.266-3.013q.345-.13.724-.14l.069-.002q.493 0 .642.099l.247-1.794q-.196-.099-.717-.099a2.3 2.3 0 0 0-.545.063 2 2 0 0 0-.411.148 2.2 2.2 0 0 0-.4.249 2.5 2.5 0 0 0-.485.499 2.7 2.7 0 0 0-.32.581l-.05.137v-1.48h-1.778v7.553h1.777v-3.884q0-.546.159-.943a1.5 1.5 0 0 1 .466-.636 2.5 2.5 0 0 1 .399-.253 2 2 0 0 1 .224-.099zm9.784 2.656.05-.922q0-1.743-.856-2.698-.838-.97-2.584-.97-1.119-.001-2.007.493a3.46 3.46 0 0 0-1.4 1.382q-.493.906-.493 2.106 0 1.07.428 1.975.428.89 1.332 1.432.906.526 2.255.526.973 0 1.668-.185l.044-.012.135-.04q.613-.184.984-.421l-.542-1.267q-.3.162-.642.274l-.297.087q-.51.131-1.3.131-.954 0-1.497-.444a1.6 1.6 0 0 1-.192-.193q-.366-.44-.512-1.234l-.004-.021zm-5.427-1.256-.003.022h3.752v-.138q-.011-.727-.288-1.118a1 1 0 0 0-.156-.176q-.46-.428-1.316-.428-.986 0-1.494.604-.379.45-.494 1.234zm-27.053 2.77V4.7h-1.86v12.095h5.333V15.15zm7.103-5.908v7.553h-1.843V9.242h1.843z'/%3E%3Cpath fill='%23fff' d='m19.63 11.151-.757-1.71-.345 1.71-1.12 5.644h-1.827L18.083 4.7h.197l3.325 6.533.988 2.19.988-2.19L26.839 4.7h.181l2.6 12.095h-1.81l-1.218-5.644-.362-1.71-.658 1.71-2.93 5.644h-.098l-2.913-5.644zm14.836 5.81q-1.02 0-1.893-.478a3.8 3.8 0 0 1-1.381-1.382q-.51-.906-.51-2.106 0-1.185.444-2.074a3.36 3.36 0 0 1 1.3-1.382q.839-.494 1.974-.494a3.3 3.3 0 0 1 1.234.231 3.3 3.3 0 0 1 .97.575q.396.33.527.659l.033-1.267h1.694v7.553H37.18l-.033-1.332q-.279.593-1.02 1.053a3.17 3.17 0 0 1-1.662.444zm.296-1.482q.938 0 1.58-.642.642-.66.642-1.711v-.115q0-.708-.296-1.267a2.2 2.2 0 0 0-.807-.872 2.1 2.1 0 0 0-1.119-.313q-1.053 0-1.629.692-.575.675-.575 1.76 0 1.103.559 1.795.577.675 1.645.675zm6.521-6.237h1.711v1.4q.906-1.597 2.83-1.597 1.596 0 2.584 1.02.988 1.005.988 2.914 0 1.185-.493 2.09a3.46 3.46 0 0 1-1.316 1.399 3.5 3.5 0 0 1-1.844.493q-.954 0-1.662-.329a2.67 2.67 0 0 1-1.086-.97l.017 5.134h-1.728zm4.048 6.22q1.07 0 1.645-.674.577-.69.576-1.762 0-1.119-.576-1.777-.558-.675-1.645-.675-.592 0-1.12.296-.51.28-.822.823-.296.527-.296 1.234v.115q0 .708.296 1.267.313.543.823.855.51.296 1.119.297z'/%3E%3Cpath fill='%23e1e3e9' d='M51.325 4.7h1.86v10.45h3.473v1.646h-5.333zm7.12 4.542h1.843v7.553h-1.843zm.905-1.415a1.16 1.16 0 0 1-.856-.346 1.17 1.17 0 0 1-.346-.856 1.05 1.05 0 0 1 .346-.79q.346-.329.856-.329.494 0 .839.33a1.05 1.05 0 0 1 .345.79 1.16 1.16 0 0 1-.345.855q-.33.346-.84.346zm7.875 9.133a3.17 3.17 0 0 1-1.662-.444q-.723-.46-1.004-1.053l-.033 1.332h-1.71V4.701h1.743v4.657l-.082 1.283q.279-.658 1.086-1.119a3.5 3.5 0 0 1 1.778-.477q1.119 0 1.942.51a3.24 3.24 0 0 1 1.283 1.4q.445.888.444 2.072 0 1.201-.526 2.09a3.5 3.5 0 0 1-1.382 1.366 3.8 3.8 0 0 1-1.876.477zm-.296-1.481q1.069 0 1.645-.675.577-.69.577-1.778 0-1.102-.577-1.776-.56-.691-1.645-.692a2.12 2.12 0 0 0-1.58.659q-.642.641-.642 1.694v.115q0 .71.296 1.267a2.4 2.4 0 0 0 .807.872 2.1 2.1 0 0 0 1.119.313zm5.927-6.237h1.777v1.481q.263-.757.856-1.217a2.14 2.14 0 0 1 1.349-.46q.527 0 .724.098l-.247 1.794q-.149-.099-.642-.099-.774 0-1.416.494-.626.493-.626 1.58v3.883h-1.777V9.242zm9.534 7.718q-1.35 0-2.255-.526-.904-.543-1.332-1.432a4.6 4.6 0 0 1-.428-1.975q0-1.2.493-2.106a3.46 3.46 0 0 1 1.4-1.382q.889-.495 2.007-.494 1.744 0 2.584.97.855.956.856 2.7 0 .444-.05.92h-5.43q.18 1.005.708 1.45.542.443 1.497.443.79 0 1.3-.131a4 4 0 0 0 .938-.362l.542 1.267q-.411.263-1.119.46-.708.198-1.711.197zm1.596-4.558q.016-1.02-.444-1.432-.46-.428-1.316-.428-1.728 0-1.991 1.86z'/%3E%3Cpath d='M5.074 15.948a.484.657 0 0 0-.486.659v1.84a.484.657 0 0 0 .486.659h4.101a.484.657 0 0 0 .486-.659v-1.84a.484.657 0 0 0-.486-.659zm3.56 1.16H5.617v.838h3.017z' style='fill:%23fff;fill-rule:evenodd;stroke-width:1.03600001'/%3E%3Cg style='stroke-width:1.12603545'%3E%3Cpath d='M-9.408-1.416c-3.833-.025-7.056 2.912-7.08 6.615-.02 3.08 1.653 4.832 3.107 6.268.903.892 1.721 1.74 2.32 2.902l-.525-.004c-.543-.003-.992.304-1.24.639a1.87 1.87 0 0 0-.362 1.121l-.011 1.877c-.003.402.104.787.347 1.125.244.338.688.653 1.23.656l4.142.028c.542.003.99-.306 1.238-.641a1.87 1.87 0 0 0 .363-1.121l.012-1.875a1.87 1.87 0 0 0-.348-1.127c-.243-.338-.688-.653-1.23-.656l-.518-.004c.597-1.145 1.425-1.983 2.348-2.87 1.473-1.414 3.18-3.149 3.2-6.226-.016-3.59-2.923-6.684-6.993-6.707m-.006 1.1v.002c3.274.02 5.92 2.532 5.9 5.6-.017 2.706-1.39 4.026-2.863 5.44-1.034.994-2.118 2.033-2.814 3.633-.018.041-.052.055-.075.065q-.013.004-.02.01a.34.34 0 0 1-.226.084.34.34 0 0 1-.224-.086l-.092-.077c-.699-1.615-1.768-2.669-2.781-3.67-1.454-1.435-2.797-2.762-2.78-5.478.02-3.067 2.7-5.545 5.975-5.523m-.02 2.826c-1.62-.01-2.944 1.315-2.955 2.96-.01 1.646 1.295 2.988 2.916 2.999h.002c1.621.01 2.943-1.316 2.953-2.961.011-1.646-1.294-2.988-2.916-2.998m-.005 1.1c1.017.006 1.829.83 1.822 1.89s-.83 1.874-1.848 1.867c-1.018-.006-1.829-.83-1.822-1.89s.83-1.874 1.848-1.868m-2.155 11.857 4.14.025c.271.002.49.305.487.676l-.013 1.875c-.003.37-.224.67-.495.668l-4.14-.025c-.27-.002-.487-.306-.485-.676l.012-1.875c.003-.37.224-.67.494-.668' style='color:%23000;font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:medium;line-height:normal;font-family:sans-serif;font-variant-ligatures:normal;font-variant-position:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-alternates:normal;font-feature-settings:normal;text-indent:0;text-align:start;text-decoration:none;text-decoration-line:none;text-decoration-style:solid;text-decoration-color:%23000;letter-spacing:normal;word-spacing:normal;text-transform:none;writing-mode:lr-tb;direction:ltr;text-orientation:mixed;dominant-baseline:auto;baseline-shift:baseline;text-anchor:start;white-space:normal;shape-padding:0;clip-rule:evenodd;display:inline;overflow:visible;visibility:visible;opacity:1;isolation:auto;mix-blend-mode:normal;color-interpolation:sRGB;color-interpolation-filters:linearRGB;solid-color:%23000;solid-opacity:1;vector-effect:none;fill:%23000;fill-opacity:.4;fill-rule:evenodd;stroke:none;stroke-width:2.47727823;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1;color-rendering:auto;image-rendering:auto;shape-rendering:auto;text-rendering:auto' transform='translate(15.553 2.85)scale(.88807)'/%3E%3Cpath d='M-9.415-.316C-12.69-.338-15.37 2.14-15.39 5.207c-.017 2.716 1.326 4.041 2.78 5.477 1.013 1 2.081 2.055 2.78 3.67l.092.076a.34.34 0 0 0 .225.086.34.34 0 0 0 .227-.083l.019-.01c.022-.009.057-.024.074-.064.697-1.6 1.78-2.64 2.814-3.634 1.473-1.414 2.847-2.733 2.864-5.44.02-3.067-2.627-5.58-5.901-5.601m-.057 8.784c1.621.011 2.944-1.315 2.955-2.96.01-1.646-1.295-2.988-2.916-2.999-1.622-.01-2.945 1.315-2.955 2.96s1.295 2.989 2.916 3' style='clip-rule:evenodd;fill:%23e1e3e9;fill-opacity:1;fill-rule:evenodd;stroke:none;stroke-width:2.47727823;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:.4' transform='translate(15.553 2.85)scale(.88807)'/%3E%3Cpath d='M-11.594 15.465c-.27-.002-.492.297-.494.668l-.012 1.876c-.003.371.214.673.485.675l4.14.027c.271.002.492-.298.495-.668l.012-1.877c.003-.37-.215-.672-.485-.674z' style='clip-rule:evenodd;fill:%23fff;fill-opacity:1;fill-rule:evenodd;stroke:none;stroke-width:2.47727823;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:.4' transform='translate(15.553 2.85)scale(.88807)'/%3E%3C/g%3E%3C/svg%3E");background-repeat:no-repeat;cursor:pointer;display:block;height:23px;margin:0 0 -4px -4px;overflow:hidden;width:88px}a.maplibregl-ctrl-logo.maplibregl-compact{width:14px}@media (forced-colors:active){a.maplibregl-ctrl-logo{background-color:transparent;background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='88' height='23' fill='none'%3E%3Cpath fill='%23000' fill-opacity='.4' fill-rule='evenodd' d='M17.408 16.796h-1.827l2.501-12.095h.198l3.324 6.533.988 2.19.988-2.19 3.258-6.533h.181l2.6 12.095h-1.81l-1.218-5.644-.362-1.71-.658 1.71-2.929 5.644h-.098l-2.914-5.644-.757-1.71-.345 1.71zm1.958-3.42-.726 3.663a1.255 1.255 0 0 1-1.232 1.011h-1.827a1.255 1.255 0 0 1-1.229-1.509l2.501-12.095a1.255 1.255 0 0 1 1.23-1.001h.197a1.25 1.25 0 0 1 1.12.685l3.19 6.273 3.125-6.263a1.25 1.25 0 0 1 1.123-.695h.181a1.255 1.255 0 0 1 1.227.991l1.443 6.71a5 5 0 0 1 .314-.787l.009-.016a4.6 4.6 0 0 1 1.777-1.887c.782-.46 1.668-.667 2.611-.667a4.6 4.6 0 0 1 1.7.32l.306.134c.21-.16.474-.256.759-.256h1.694a1.255 1.255 0 0 1 1.212.925 1.255 1.255 0 0 1 1.212-.925h1.711c.284 0 .545.094.755.252.613-.3 1.312-.45 2.075-.45 1.356 0 2.557.445 3.482 1.4q.47.48.763 1.064V4.701a1.255 1.255 0 0 1 1.255-1.255h1.86A1.255 1.255 0 0 1 54.44 4.7v9.194h2.217c.19 0 .37.043.532.118v-4.77c0-.356.147-.678.385-.906a2.42 2.42 0 0 1-.682-1.71c0-.665.267-1.253.735-1.7a2.45 2.45 0 0 1 1.722-.674 2.43 2.43 0 0 1 1.705.675q.318.302.504.683V4.7a1.255 1.255 0 0 1 1.255-1.255h1.744A1.255 1.255 0 0 1 65.812 4.7v3.335a4.8 4.8 0 0 1 1.526-.246c.938 0 1.817.214 2.59.69a4.47 4.47 0 0 1 1.67 1.743v-.98a1.255 1.255 0 0 1 1.256-1.256h1.777c.233 0 .451.064.639.174a3.4 3.4 0 0 1 1.567-.372c.346 0 .861.02 1.285.232a1.25 1.25 0 0 1 .689 1.004 4.7 4.7 0 0 1 .853-.588c.795-.44 1.675-.647 2.61-.647 1.385 0 2.65.39 3.525 1.396.836.938 1.168 2.173 1.168 3.528q-.001.515-.056 1.051a1.255 1.255 0 0 1-.947 1.09l.408.952a1.255 1.255 0 0 1-.477 1.552c-.418.268-.92.463-1.458.612-.613.171-1.304.244-2.049.244-1.06 0-2.043-.207-2.886-.698l-.015-.008c-.798-.48-1.419-1.135-1.818-1.963l-.004-.008a5.8 5.8 0 0 1-.548-2.512q0-.429.053-.843a1.3 1.3 0 0 1-.333-.086l-.166-.004c-.223 0-.426.062-.643.228-.03.024-.142.139-.142.59v3.883a1.255 1.255 0 0 1-1.256 1.256h-1.777a1.255 1.255 0 0 1-1.256-1.256V15.69l-.032.057a4.8 4.8 0 0 1-1.86 1.833 5.04 5.04 0 0 1-2.484.634 4.5 4.5 0 0 1-1.935-.424 1.25 1.25 0 0 1-.764.258h-1.71a1.255 1.255 0 0 1-1.256-1.255V7.687a2.4 2.4 0 0 1-.428.625c.253.23.412.561.412.93v7.553a1.255 1.255 0 0 1-1.256 1.255h-1.843a1.25 1.25 0 0 1-.894-.373c-.228.23-.544.373-.894.373H51.32a1.255 1.255 0 0 1-1.256-1.255v-1.251l-.061.117a4.7 4.7 0 0 1-1.782 1.884 4.77 4.77 0 0 1-2.485.67 5.6 5.6 0 0 1-1.485-.188l.009 2.764a1.255 1.255 0 0 1-1.255 1.259h-1.729a1.255 1.255 0 0 1-1.255-1.255v-3.537a1.255 1.255 0 0 1-1.167.793h-1.679a1.25 1.25 0 0 1-.77-.263 4.5 4.5 0 0 1-1.945.429c-.885 0-1.724-.21-2.495-.632l-.017-.01a5 5 0 0 1-1.081-.836 1.255 1.255 0 0 1-1.254 1.312h-1.81a1.255 1.255 0 0 1-1.228-.99l-.782-3.625-2.044 3.939a1.25 1.25 0 0 1-1.115.676h-.098a1.25 1.25 0 0 1-1.116-.68l-2.061-3.994zM35.92 16.63l.207-.114.223-.15q.493-.356.735-.785l.061-.118.033 1.332h1.678V9.242h-1.694l-.033 1.267q-.133-.329-.526-.658l-.032-.028a3.2 3.2 0 0 0-.668-.428l-.27-.12a3.3 3.3 0 0 0-1.235-.23q-1.136-.001-1.974.493a3.36 3.36 0 0 0-1.3 1.382q-.445.89-.444 2.074 0 1.2.51 2.107a3.8 3.8 0 0 0 1.382 1.381 3.9 3.9 0 0 0 1.893.477q.795 0 1.455-.33zm-2.789-5.38q-.576.675-.575 1.762 0 1.102.559 1.794.576.675 1.645.675a2.25 2.25 0 0 0 .934-.19 2.2 2.2 0 0 0 .468-.29l.178-.161a2.2 2.2 0 0 0 .397-.561q.244-.5.244-1.15v-.115q0-.708-.296-1.267l-.043-.077a2.2 2.2 0 0 0-.633-.709l-.13-.086-.047-.028a2.1 2.1 0 0 0-1.073-.285q-1.052 0-1.629.692zm2.316 2.706c.163-.17.28-.407.28-.83v-.114c0-.292-.06-.508-.15-.68a.96.96 0 0 0-.353-.389.85.85 0 0 0-.464-.127c-.4 0-.56.114-.664.239l-.01.012c-.148.174-.275.45-.275.945 0 .506.122.801.27.99.097.11.266.224.68.224.303 0 .504-.09.687-.269zm7.545 1.705a2.6 2.6 0 0 0 .331.423q.319.33.755.548l.173.074q.65.255 1.49.255 1.02 0 1.844-.493a3.45 3.45 0 0 0 1.316-1.4q.493-.904.493-2.089 0-1.909-.988-2.913-.988-1.02-2.584-1.02-.898 0-1.575.347a3 3 0 0 0-.415.262l-.199.166a3.4 3.4 0 0 0-.64.82V9.242h-1.712v11.553h1.729l-.017-5.134zm.53-1.138q.206.29.48.5l.155.11.053.034q.51.296 1.119.297 1.07 0 1.645-.675.577-.69.576-1.762 0-1.119-.576-1.777-.558-.675-1.645-.675-.435 0-.835.16a2 2 0 0 0-.284.136 2 2 0 0 0-.363.254 2.2 2.2 0 0 0-.46.569l-.082.162a2.6 2.6 0 0 0-.213 1.072v.115q0 .707.296 1.267l.135.211zm.964-.818a1.1 1.1 0 0 0 .367.385.94.94 0 0 0 .476.118c.423 0 .59-.117.687-.23.159-.194.28-.478.28-.95 0-.53-.133-.8-.266-.952l-.021-.025c-.078-.094-.231-.221-.68-.221a1 1 0 0 0-.503.135l-.012.007a.86.86 0 0 0-.335.343c-.073.133-.132.324-.132.614v.115a1.4 1.4 0 0 0 .14.66zm15.7-6.222q.347-.346.346-.856a1.05 1.05 0 0 0-.345-.79 1.18 1.18 0 0 0-.84-.329q-.51 0-.855.33a1.05 1.05 0 0 0-.346.79q0 .51.346.855.345.346.856.346.51 0 .839-.346zm4.337 9.314.033-1.332q.191.403.59.747l.098.081a4 4 0 0 0 .316.224l.223.122a3.2 3.2 0 0 0 1.44.322 3.8 3.8 0 0 0 1.875-.477 3.5 3.5 0 0 0 1.382-1.366q.527-.89.526-2.09 0-1.184-.444-2.073a3.24 3.24 0 0 0-1.283-1.399q-.823-.51-1.942-.51a3.5 3.5 0 0 0-1.527.344l-.086.043-.165.09a3 3 0 0 0-.33.214q-.432.315-.656.707a2 2 0 0 0-.099.198l.082-1.283V4.701h-1.744v12.095zm.473-2.509a2.5 2.5 0 0 0 .566.7q.117.098.245.18l.144.08a2.1 2.1 0 0 0 .975.232q1.07 0 1.645-.675.576-.69.576-1.778 0-1.102-.576-1.777-.56-.691-1.645-.692a2.2 2.2 0 0 0-1.015.235q-.22.113-.415.282l-.15.142a2.1 2.1 0 0 0-.42.594q-.223.479-.223 1.1v.115q0 .705.293 1.26zm2.616-.293c.157-.191.28-.479.28-.967 0-.51-.13-.79-.276-.961l-.021-.026c-.082-.1-.232-.225-.67-.225a.87.87 0 0 0-.681.279l-.012.011c-.154.155-.274.38-.274.807v.115c0 .285.057.499.144.669a1.1 1.1 0 0 0 .367.405c.137.082.28.123.455.123.423 0 .59-.118.686-.23zm8.266-3.013q.345-.13.724-.14l.069-.002q.493 0 .642.099l.247-1.794q-.196-.099-.717-.099a2.3 2.3 0 0 0-.545.063 2 2 0 0 0-.411.148 2.2 2.2 0 0 0-.4.249 2.5 2.5 0 0 0-.485.499 2.7 2.7 0 0 0-.32.581l-.05.137v-1.48h-1.778v7.553h1.777v-3.884q0-.546.159-.943a1.5 1.5 0 0 1 .466-.636 2.5 2.5 0 0 1 .399-.253 2 2 0 0 1 .224-.099zm9.784 2.656.05-.922q0-1.743-.856-2.698-.838-.97-2.584-.97-1.119-.001-2.007.493a3.46 3.46 0 0 0-1.4 1.382q-.493.906-.493 2.106 0 1.07.428 1.975.428.89 1.332 1.432.906.526 2.255.526.973 0 1.668-.185l.044-.012.135-.04q.613-.184.984-.421l-.542-1.267q-.3.162-.642.274l-.297.087q-.51.131-1.3.131-.954 0-1.497-.444a1.6 1.6 0 0 1-.192-.193q-.366-.44-.512-1.234l-.004-.021zm-5.427-1.256-.003.022h3.752v-.138q-.011-.727-.288-1.118a1 1 0 0 0-.156-.176q-.46-.428-1.316-.428-.986 0-1.494.604-.379.45-.494 1.234zm-27.053 2.77V4.7h-1.86v12.095h5.333V15.15zm7.103-5.908v7.553h-1.843V9.242h1.843z'/%3E%3Cpath fill='%23fff' d='m19.63 11.151-.757-1.71-.345 1.71-1.12 5.644h-1.827L18.083 4.7h.197l3.325 6.533.988 2.19.988-2.19L26.839 4.7h.181l2.6 12.095h-1.81l-1.218-5.644-.362-1.71-.658 1.71-2.93 5.644h-.098l-2.913-5.644zm14.836 5.81q-1.02 0-1.893-.478a3.8 3.8 0 0 1-1.381-1.382q-.51-.906-.51-2.106 0-1.185.444-2.074a3.36 3.36 0 0 1 1.3-1.382q.839-.494 1.974-.494a3.3 3.3 0 0 1 1.234.231 3.3 3.3 0 0 1 .97.575q.396.33.527.659l.033-1.267h1.694v7.553H37.18l-.033-1.332q-.279.593-1.02 1.053a3.17 3.17 0 0 1-1.662.444zm.296-1.482q.938 0 1.58-.642.642-.66.642-1.711v-.115q0-.708-.296-1.267a2.2 2.2 0 0 0-.807-.872 2.1 2.1 0 0 0-1.119-.313q-1.053 0-1.629.692-.575.675-.575 1.76 0 1.103.559 1.795.577.675 1.645.675zm6.521-6.237h1.711v1.4q.906-1.597 2.83-1.597 1.596 0 2.584 1.02.988 1.005.988 2.914 0 1.185-.493 2.09a3.46 3.46 0 0 1-1.316 1.399 3.5 3.5 0 0 1-1.844.493q-.954 0-1.662-.329a2.67 2.67 0 0 1-1.086-.97l.017 5.134h-1.728zm4.048 6.22q1.07 0 1.645-.674.577-.69.576-1.762 0-1.119-.576-1.777-.558-.675-1.645-.675-.592 0-1.12.296-.51.28-.822.823-.296.527-.296 1.234v.115q0 .708.296 1.267.313.543.823.855.51.296 1.119.297z'/%3E%3Cpath fill='%23e1e3e9' d='M51.325 4.7h1.86v10.45h3.473v1.646h-5.333zm7.12 4.542h1.843v7.553h-1.843zm.905-1.415a1.16 1.16 0 0 1-.856-.346 1.17 1.17 0 0 1-.346-.856 1.05 1.05 0 0 1 .346-.79q.346-.329.856-.329.494 0 .839.33a1.05 1.05 0 0 1 .345.79 1.16 1.16 0 0 1-.345.855q-.33.346-.84.346zm7.875 9.133a3.17 3.17 0 0 1-1.662-.444q-.723-.46-1.004-1.053l-.033 1.332h-1.71V4.701h1.743v4.657l-.082 1.283q.279-.658 1.086-1.119a3.5 3.5 0 0 1 1.778-.477q1.119 0 1.942.51a3.24 3.24 0 0 1 1.283 1.4q.445.888.444 2.072 0 1.201-.526 2.09a3.5 3.5 0 0 1-1.382 1.366 3.8 3.8 0 0 1-1.876.477zm-.296-1.481q1.069 0 1.645-.675.577-.69.577-1.778 0-1.102-.577-1.776-.56-.691-1.645-.692a2.12 2.12 0 0 0-1.58.659q-.642.641-.642 1.694v.115q0 .71.296 1.267a2.4 2.4 0 0 0 .807.872 2.1 2.1 0 0 0 1.119.313zm5.927-6.237h1.777v1.481q.263-.757.856-1.217a2.14 2.14 0 0 1 1.349-.46q.527 0 .724.098l-.247 1.794q-.149-.099-.642-.099-.774 0-1.416.494-.626.493-.626 1.58v3.883h-1.777V9.242zm9.534 7.718q-1.35 0-2.255-.526-.904-.543-1.332-1.432a4.6 4.6 0 0 1-.428-1.975q0-1.2.493-2.106a3.46 3.46 0 0 1 1.4-1.382q.889-.495 2.007-.494 1.744 0 2.584.97.855.956.856 2.7 0 .444-.05.92h-5.43q.18 1.005.708 1.45.542.443 1.497.443.79 0 1.3-.131a4 4 0 0 0 .938-.362l.542 1.267q-.411.263-1.119.46-.708.198-1.711.197zm1.596-4.558q.016-1.02-.444-1.432-.46-.428-1.316-.428-1.728 0-1.991 1.86z'/%3E%3Cpath d='M5.074 15.948a.484.657 0 0 0-.486.659v1.84a.484.657 0 0 0 .486.659h4.101a.484.657 0 0 0 .486-.659v-1.84a.484.657 0 0 0-.486-.659zm3.56 1.16H5.617v.838h3.017z' style='fill:%23fff;fill-rule:evenodd;stroke-width:1.03600001'/%3E%3Cg style='stroke-width:1.12603545'%3E%3Cpath d='M-9.408-1.416c-3.833-.025-7.056 2.912-7.08 6.615-.02 3.08 1.653 4.832 3.107 6.268.903.892 1.721 1.74 2.32 2.902l-.525-.004c-.543-.003-.992.304-1.24.639a1.87 1.87 0 0 0-.362 1.121l-.011 1.877c-.003.402.104.787.347 1.125.244.338.688.653 1.23.656l4.142.028c.542.003.99-.306 1.238-.641a1.87 1.87 0 0 0 .363-1.121l.012-1.875a1.87 1.87 0 0 0-.348-1.127c-.243-.338-.688-.653-1.23-.656l-.518-.004c.597-1.145 1.425-1.983 2.348-2.87 1.473-1.414 3.18-3.149 3.2-6.226-.016-3.59-2.923-6.684-6.993-6.707m-.006 1.1v.002c3.274.02 5.92 2.532 5.9 5.6-.017 2.706-1.39 4.026-2.863 5.44-1.034.994-2.118 2.033-2.814 3.633-.018.041-.052.055-.075.065q-.013.004-.02.01a.34.34 0 0 1-.226.084.34.34 0 0 1-.224-.086l-.092-.077c-.699-1.615-1.768-2.669-2.781-3.67-1.454-1.435-2.797-2.762-2.78-5.478.02-3.067 2.7-5.545 5.975-5.523m-.02 2.826c-1.62-.01-2.944 1.315-2.955 2.96-.01 1.646 1.295 2.988 2.916 2.999h.002c1.621.01 2.943-1.316 2.953-2.961.011-1.646-1.294-2.988-2.916-2.998m-.005 1.1c1.017.006 1.829.83 1.822 1.89s-.83 1.874-1.848 1.867c-1.018-.006-1.829-.83-1.822-1.89s.83-1.874 1.848-1.868m-2.155 11.857 4.14.025c.271.002.49.305.487.676l-.013 1.875c-.003.37-.224.67-.495.668l-4.14-.025c-.27-.002-.487-.306-.485-.676l.012-1.875c.003-.37.224-.67.494-.668' style='color:%23000;font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:medium;line-height:normal;font-family:sans-serif;font-variant-ligatures:normal;font-variant-position:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-alternates:normal;font-feature-settings:normal;text-indent:0;text-align:start;text-decoration:none;text-decoration-line:none;text-decoration-style:solid;text-decoration-color:%23000;letter-spacing:normal;word-spacing:normal;text-transform:none;writing-mode:lr-tb;direction:ltr;text-orientation:mixed;dominant-baseline:auto;baseline-shift:baseline;text-anchor:start;white-space:normal;shape-padding:0;clip-rule:evenodd;display:inline;overflow:visible;visibility:visible;opacity:1;isolation:auto;mix-blend-mode:normal;color-interpolation:sRGB;color-interpolation-filters:linearRGB;solid-color:%23000;solid-opacity:1;vector-effect:none;fill:%23000;fill-opacity:.4;fill-rule:evenodd;stroke:none;stroke-width:2.47727823;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1;color-rendering:auto;image-rendering:auto;shape-rendering:auto;text-rendering:auto' transform='translate(15.553 2.85)scale(.88807)'/%3E%3Cpath d='M-9.415-.316C-12.69-.338-15.37 2.14-15.39 5.207c-.017 2.716 1.326 4.041 2.78 5.477 1.013 1 2.081 2.055 2.78 3.67l.092.076a.34.34 0 0 0 .225.086.34.34 0 0 0 .227-.083l.019-.01c.022-.009.057-.024.074-.064.697-1.6 1.78-2.64 2.814-3.634 1.473-1.414 2.847-2.733 2.864-5.44.02-3.067-2.627-5.58-5.901-5.601m-.057 8.784c1.621.011 2.944-1.315 2.955-2.96.01-1.646-1.295-2.988-2.916-2.999-1.622-.01-2.945 1.315-2.955 2.96s1.295 2.989 2.916 3' style='clip-rule:evenodd;fill:%23e1e3e9;fill-opacity:1;fill-rule:evenodd;stroke:none;stroke-width:2.47727823;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:.4' transform='translate(15.553 2.85)scale(.88807)'/%3E%3Cpath d='M-11.594 15.465c-.27-.002-.492.297-.494.668l-.012 1.876c-.003.371.214.673.485.675l4.14.027c.271.002.492-.298.495-.668l.012-1.877c.003-.37-.215-.672-.485-.674z' style='clip-rule:evenodd;fill:%23fff;fill-opacity:1;fill-rule:evenodd;stroke:none;stroke-width:2.47727823;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:.4' transform='translate(15.553 2.85)scale(.88807)'/%3E%3C/g%3E%3C/svg%3E")}}@media (forced-colors:active) and (prefers-color-scheme:light){a.maplibregl-ctrl-logo{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='88' height='23' fill='none'%3E%3Cpath fill='%23000' fill-opacity='.4' fill-rule='evenodd' d='M17.408 16.796h-1.827l2.501-12.095h.198l3.324 6.533.988 2.19.988-2.19 3.258-6.533h.181l2.6 12.095h-1.81l-1.218-5.644-.362-1.71-.658 1.71-2.929 5.644h-.098l-2.914-5.644-.757-1.71-.345 1.71zm1.958-3.42-.726 3.663a1.255 1.255 0 0 1-1.232 1.011h-1.827a1.255 1.255 0 0 1-1.229-1.509l2.501-12.095a1.255 1.255 0 0 1 1.23-1.001h.197a1.25 1.25 0 0 1 1.12.685l3.19 6.273 3.125-6.263a1.25 1.25 0 0 1 1.123-.695h.181a1.255 1.255 0 0 1 1.227.991l1.443 6.71a5 5 0 0 1 .314-.787l.009-.016a4.6 4.6 0 0 1 1.777-1.887c.782-.46 1.668-.667 2.611-.667a4.6 4.6 0 0 1 1.7.32l.306.134c.21-.16.474-.256.759-.256h1.694a1.255 1.255 0 0 1 1.212.925 1.255 1.255 0 0 1 1.212-.925h1.711c.284 0 .545.094.755.252.613-.3 1.312-.45 2.075-.45 1.356 0 2.557.445 3.482 1.4q.47.48.763 1.064V4.701a1.255 1.255 0 0 1 1.255-1.255h1.86A1.255 1.255 0 0 1 54.44 4.7v9.194h2.217c.19 0 .37.043.532.118v-4.77c0-.356.147-.678.385-.906a2.42 2.42 0 0 1-.682-1.71c0-.665.267-1.253.735-1.7a2.45 2.45 0 0 1 1.722-.674 2.43 2.43 0 0 1 1.705.675q.318.302.504.683V4.7a1.255 1.255 0 0 1 1.255-1.255h1.744A1.255 1.255 0 0 1 65.812 4.7v3.335a4.8 4.8 0 0 1 1.526-.246c.938 0 1.817.214 2.59.69a4.47 4.47 0 0 1 1.67 1.743v-.98a1.255 1.255 0 0 1 1.256-1.256h1.777c.233 0 .451.064.639.174a3.4 3.4 0 0 1 1.567-.372c.346 0 .861.02 1.285.232a1.25 1.25 0 0 1 .689 1.004 4.7 4.7 0 0 1 .853-.588c.795-.44 1.675-.647 2.61-.647 1.385 0 2.65.39 3.525 1.396.836.938 1.168 2.173 1.168 3.528q-.001.515-.056 1.051a1.255 1.255 0 0 1-.947 1.09l.408.952a1.255 1.255 0 0 1-.477 1.552c-.418.268-.92.463-1.458.612-.613.171-1.304.244-2.049.244-1.06 0-2.043-.207-2.886-.698l-.015-.008c-.798-.48-1.419-1.135-1.818-1.963l-.004-.008a5.8 5.8 0 0 1-.548-2.512q0-.429.053-.843a1.3 1.3 0 0 1-.333-.086l-.166-.004c-.223 0-.426.062-.643.228-.03.024-.142.139-.142.59v3.883a1.255 1.255 0 0 1-1.256 1.256h-1.777a1.255 1.255 0 0 1-1.256-1.256V15.69l-.032.057a4.8 4.8 0 0 1-1.86 1.833 5.04 5.04 0 0 1-2.484.634 4.5 4.5 0 0 1-1.935-.424 1.25 1.25 0 0 1-.764.258h-1.71a1.255 1.255 0 0 1-1.256-1.255V7.687a2.4 2.4 0 0 1-.428.625c.253.23.412.561.412.93v7.553a1.255 1.255 0 0 1-1.256 1.255h-1.843a1.25 1.25 0 0 1-.894-.373c-.228.23-.544.373-.894.373H51.32a1.255 1.255 0 0 1-1.256-1.255v-1.251l-.061.117a4.7 4.7 0 0 1-1.782 1.884 4.77 4.77 0 0 1-2.485.67 5.6 5.6 0 0 1-1.485-.188l.009 2.764a1.255 1.255 0 0 1-1.255 1.259h-1.729a1.255 1.255 0 0 1-1.255-1.255v-3.537a1.255 1.255 0 0 1-1.167.793h-1.679a1.25 1.25 0 0 1-.77-.263 4.5 4.5 0 0 1-1.945.429c-.885 0-1.724-.21-2.495-.632l-.017-.01a5 5 0 0 1-1.081-.836 1.255 1.255 0 0 1-1.254 1.312h-1.81a1.255 1.255 0 0 1-1.228-.99l-.782-3.625-2.044 3.939a1.25 1.25 0 0 1-1.115.676h-.098a1.25 1.25 0 0 1-1.116-.68l-2.061-3.994zM35.92 16.63l.207-.114.223-.15q.493-.356.735-.785l.061-.118.033 1.332h1.678V9.242h-1.694l-.033 1.267q-.133-.329-.526-.658l-.032-.028a3.2 3.2 0 0 0-.668-.428l-.27-.12a3.3 3.3 0 0 0-1.235-.23q-1.136-.001-1.974.493a3.36 3.36 0 0 0-1.3 1.382q-.445.89-.444 2.074 0 1.2.51 2.107a3.8 3.8 0 0 0 1.382 1.381 3.9 3.9 0 0 0 1.893.477q.795 0 1.455-.33zm-2.789-5.38q-.576.675-.575 1.762 0 1.102.559 1.794.576.675 1.645.675a2.25 2.25 0 0 0 .934-.19 2.2 2.2 0 0 0 .468-.29l.178-.161a2.2 2.2 0 0 0 .397-.561q.244-.5.244-1.15v-.115q0-.708-.296-1.267l-.043-.077a2.2 2.2 0 0 0-.633-.709l-.13-.086-.047-.028a2.1 2.1 0 0 0-1.073-.285q-1.052 0-1.629.692zm2.316 2.706c.163-.17.28-.407.28-.83v-.114c0-.292-.06-.508-.15-.68a.96.96 0 0 0-.353-.389.85.85 0 0 0-.464-.127c-.4 0-.56.114-.664.239l-.01.012c-.148.174-.275.45-.275.945 0 .506.122.801.27.99.097.11.266.224.68.224.303 0 .504-.09.687-.269zm7.545 1.705a2.6 2.6 0 0 0 .331.423q.319.33.755.548l.173.074q.65.255 1.49.255 1.02 0 1.844-.493a3.45 3.45 0 0 0 1.316-1.4q.493-.904.493-2.089 0-1.909-.988-2.913-.988-1.02-2.584-1.02-.898 0-1.575.347a3 3 0 0 0-.415.262l-.199.166a3.4 3.4 0 0 0-.64.82V9.242h-1.712v11.553h1.729l-.017-5.134zm.53-1.138q.206.29.48.5l.155.11.053.034q.51.296 1.119.297 1.07 0 1.645-.675.577-.69.576-1.762 0-1.119-.576-1.777-.558-.675-1.645-.675-.435 0-.835.16a2 2 0 0 0-.284.136 2 2 0 0 0-.363.254 2.2 2.2 0 0 0-.46.569l-.082.162a2.6 2.6 0 0 0-.213 1.072v.115q0 .707.296 1.267l.135.211zm.964-.818a1.1 1.1 0 0 0 .367.385.94.94 0 0 0 .476.118c.423 0 .59-.117.687-.23.159-.194.28-.478.28-.95 0-.53-.133-.8-.266-.952l-.021-.025c-.078-.094-.231-.221-.68-.221a1 1 0 0 0-.503.135l-.012.007a.86.86 0 0 0-.335.343c-.073.133-.132.324-.132.614v.115a1.4 1.4 0 0 0 .14.66zm15.7-6.222q.347-.346.346-.856a1.05 1.05 0 0 0-.345-.79 1.18 1.18 0 0 0-.84-.329q-.51 0-.855.33a1.05 1.05 0 0 0-.346.79q0 .51.346.855.345.346.856.346.51 0 .839-.346zm4.337 9.314.033-1.332q.191.403.59.747l.098.081a4 4 0 0 0 .316.224l.223.122a3.2 3.2 0 0 0 1.44.322 3.8 3.8 0 0 0 1.875-.477 3.5 3.5 0 0 0 1.382-1.366q.527-.89.526-2.09 0-1.184-.444-2.073a3.24 3.24 0 0 0-1.283-1.399q-.823-.51-1.942-.51a3.5 3.5 0 0 0-1.527.344l-.086.043-.165.09a3 3 0 0 0-.33.214q-.432.315-.656.707a2 2 0 0 0-.099.198l.082-1.283V4.701h-1.744v12.095zm.473-2.509a2.5 2.5 0 0 0 .566.7q.117.098.245.18l.144.08a2.1 2.1 0 0 0 .975.232q1.07 0 1.645-.675.576-.69.576-1.778 0-1.102-.576-1.777-.56-.691-1.645-.692a2.2 2.2 0 0 0-1.015.235q-.22.113-.415.282l-.15.142a2.1 2.1 0 0 0-.42.594q-.223.479-.223 1.1v.115q0 .705.293 1.26zm2.616-.293c.157-.191.28-.479.28-.967 0-.51-.13-.79-.276-.961l-.021-.026c-.082-.1-.232-.225-.67-.225a.87.87 0 0 0-.681.279l-.012.011c-.154.155-.274.38-.274.807v.115c0 .285.057.499.144.669a1.1 1.1 0 0 0 .367.405c.137.082.28.123.455.123.423 0 .59-.118.686-.23zm8.266-3.013q.345-.13.724-.14l.069-.002q.493 0 .642.099l.247-1.794q-.196-.099-.717-.099a2.3 2.3 0 0 0-.545.063 2 2 0 0 0-.411.148 2.2 2.2 0 0 0-.4.249 2.5 2.5 0 0 0-.485.499 2.7 2.7 0 0 0-.32.581l-.05.137v-1.48h-1.778v7.553h1.777v-3.884q0-.546.159-.943a1.5 1.5 0 0 1 .466-.636 2.5 2.5 0 0 1 .399-.253 2 2 0 0 1 .224-.099zm9.784 2.656.05-.922q0-1.743-.856-2.698-.838-.97-2.584-.97-1.119-.001-2.007.493a3.46 3.46 0 0 0-1.4 1.382q-.493.906-.493 2.106 0 1.07.428 1.975.428.89 1.332 1.432.906.526 2.255.526.973 0 1.668-.185l.044-.012.135-.04q.613-.184.984-.421l-.542-1.267q-.3.162-.642.274l-.297.087q-.51.131-1.3.131-.954 0-1.497-.444a1.6 1.6 0 0 1-.192-.193q-.366-.44-.512-1.234l-.004-.021zm-5.427-1.256-.003.022h3.752v-.138q-.011-.727-.288-1.118a1 1 0 0 0-.156-.176q-.46-.428-1.316-.428-.986 0-1.494.604-.379.45-.494 1.234zm-27.053 2.77V4.7h-1.86v12.095h5.333V15.15zm7.103-5.908v7.553h-1.843V9.242h1.843z'/%3E%3Cpath fill='%23fff' d='m19.63 11.151-.757-1.71-.345 1.71-1.12 5.644h-1.827L18.083 4.7h.197l3.325 6.533.988 2.19.988-2.19L26.839 4.7h.181l2.6 12.095h-1.81l-1.218-5.644-.362-1.71-.658 1.71-2.93 5.644h-.098l-2.913-5.644zm14.836 5.81q-1.02 0-1.893-.478a3.8 3.8 0 0 1-1.381-1.382q-.51-.906-.51-2.106 0-1.185.444-2.074a3.36 3.36 0 0 1 1.3-1.382q.839-.494 1.974-.494a3.3 3.3 0 0 1 1.234.231 3.3 3.3 0 0 1 .97.575q.396.33.527.659l.033-1.267h1.694v7.553H37.18l-.033-1.332q-.279.593-1.02 1.053a3.17 3.17 0 0 1-1.662.444zm.296-1.482q.938 0 1.58-.642.642-.66.642-1.711v-.115q0-.708-.296-1.267a2.2 2.2 0 0 0-.807-.872 2.1 2.1 0 0 0-1.119-.313q-1.053 0-1.629.692-.575.675-.575 1.76 0 1.103.559 1.795.577.675 1.645.675zm6.521-6.237h1.711v1.4q.906-1.597 2.83-1.597 1.596 0 2.584 1.02.988 1.005.988 2.914 0 1.185-.493 2.09a3.46 3.46 0 0 1-1.316 1.399 3.5 3.5 0 0 1-1.844.493q-.954 0-1.662-.329a2.67 2.67 0 0 1-1.086-.97l.017 5.134h-1.728zm4.048 6.22q1.07 0 1.645-.674.577-.69.576-1.762 0-1.119-.576-1.777-.558-.675-1.645-.675-.592 0-1.12.296-.51.28-.822.823-.296.527-.296 1.234v.115q0 .708.296 1.267.313.543.823.855.51.296 1.119.297z'/%3E%3Cpath fill='%23e1e3e9' d='M51.325 4.7h1.86v10.45h3.473v1.646h-5.333zm7.12 4.542h1.843v7.553h-1.843zm.905-1.415a1.16 1.16 0 0 1-.856-.346 1.17 1.17 0 0 1-.346-.856 1.05 1.05 0 0 1 .346-.79q.346-.329.856-.329.494 0 .839.33a1.05 1.05 0 0 1 .345.79 1.16 1.16 0 0 1-.345.855q-.33.346-.84.346zm7.875 9.133a3.17 3.17 0 0 1-1.662-.444q-.723-.46-1.004-1.053l-.033 1.332h-1.71V4.701h1.743v4.657l-.082 1.283q.279-.658 1.086-1.119a3.5 3.5 0 0 1 1.778-.477q1.119 0 1.942.51a3.24 3.24 0 0 1 1.283 1.4q.445.888.444 2.072 0 1.201-.526 2.09a3.5 3.5 0 0 1-1.382 1.366 3.8 3.8 0 0 1-1.876.477zm-.296-1.481q1.069 0 1.645-.675.577-.69.577-1.778 0-1.102-.577-1.776-.56-.691-1.645-.692a2.12 2.12 0 0 0-1.58.659q-.642.641-.642 1.694v.115q0 .71.296 1.267a2.4 2.4 0 0 0 .807.872 2.1 2.1 0 0 0 1.119.313zm5.927-6.237h1.777v1.481q.263-.757.856-1.217a2.14 2.14 0 0 1 1.349-.46q.527 0 .724.098l-.247 1.794q-.149-.099-.642-.099-.774 0-1.416.494-.626.493-.626 1.58v3.883h-1.777V9.242zm9.534 7.718q-1.35 0-2.255-.526-.904-.543-1.332-1.432a4.6 4.6 0 0 1-.428-1.975q0-1.2.493-2.106a3.46 3.46 0 0 1 1.4-1.382q.889-.495 2.007-.494 1.744 0 2.584.97.855.956.856 2.7 0 .444-.05.92h-5.43q.18 1.005.708 1.45.542.443 1.497.443.79 0 1.3-.131a4 4 0 0 0 .938-.362l.542 1.267q-.411.263-1.119.46-.708.198-1.711.197zm1.596-4.558q.016-1.02-.444-1.432-.46-.428-1.316-.428-1.728 0-1.991 1.86z'/%3E%3Cpath d='M5.074 15.948a.484.657 0 0 0-.486.659v1.84a.484.657 0 0 0 .486.659h4.101a.484.657 0 0 0 .486-.659v-1.84a.484.657 0 0 0-.486-.659zm3.56 1.16H5.617v.838h3.017z' style='fill:%23fff;fill-rule:evenodd;stroke-width:1.03600001'/%3E%3Cg style='stroke-width:1.12603545'%3E%3Cpath d='M-9.408-1.416c-3.833-.025-7.056 2.912-7.08 6.615-.02 3.08 1.653 4.832 3.107 6.268.903.892 1.721 1.74 2.32 2.902l-.525-.004c-.543-.003-.992.304-1.24.639a1.87 1.87 0 0 0-.362 1.121l-.011 1.877c-.003.402.104.787.347 1.125.244.338.688.653 1.23.656l4.142.028c.542.003.99-.306 1.238-.641a1.87 1.87 0 0 0 .363-1.121l.012-1.875a1.87 1.87 0 0 0-.348-1.127c-.243-.338-.688-.653-1.23-.656l-.518-.004c.597-1.145 1.425-1.983 2.348-2.87 1.473-1.414 3.18-3.149 3.2-6.226-.016-3.59-2.923-6.684-6.993-6.707m-.006 1.1v.002c3.274.02 5.92 2.532 5.9 5.6-.017 2.706-1.39 4.026-2.863 5.44-1.034.994-2.118 2.033-2.814 3.633-.018.041-.052.055-.075.065q-.013.004-.02.01a.34.34 0 0 1-.226.084.34.34 0 0 1-.224-.086l-.092-.077c-.699-1.615-1.768-2.669-2.781-3.67-1.454-1.435-2.797-2.762-2.78-5.478.02-3.067 2.7-5.545 5.975-5.523m-.02 2.826c-1.62-.01-2.944 1.315-2.955 2.96-.01 1.646 1.295 2.988 2.916 2.999h.002c1.621.01 2.943-1.316 2.953-2.961.011-1.646-1.294-2.988-2.916-2.998m-.005 1.1c1.017.006 1.829.83 1.822 1.89s-.83 1.874-1.848 1.867c-1.018-.006-1.829-.83-1.822-1.89s.83-1.874 1.848-1.868m-2.155 11.857 4.14.025c.271.002.49.305.487.676l-.013 1.875c-.003.37-.224.67-.495.668l-4.14-.025c-.27-.002-.487-.306-.485-.676l.012-1.875c.003-.37.224-.67.494-.668' style='color:%23000;font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:medium;line-height:normal;font-family:sans-serif;font-variant-ligatures:normal;font-variant-position:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-alternates:normal;font-feature-settings:normal;text-indent:0;text-align:start;text-decoration:none;text-decoration-line:none;text-decoration-style:solid;text-decoration-color:%23000;letter-spacing:normal;word-spacing:normal;text-transform:none;writing-mode:lr-tb;direction:ltr;text-orientation:mixed;dominant-baseline:auto;baseline-shift:baseline;text-anchor:start;white-space:normal;shape-padding:0;clip-rule:evenodd;display:inline;overflow:visible;visibility:visible;opacity:1;isolation:auto;mix-blend-mode:normal;color-interpolation:sRGB;color-interpolation-filters:linearRGB;solid-color:%23000;solid-opacity:1;vector-effect:none;fill:%23000;fill-opacity:.4;fill-rule:evenodd;stroke:none;stroke-width:2.47727823;stroke-linecap:butt;stroke-linejoin:miter;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1;color-rendering:auto;image-rendering:auto;shape-rendering:auto;text-rendering:auto' transform='translate(15.553 2.85)scale(.88807)'/%3E%3Cpath d='M-9.415-.316C-12.69-.338-15.37 2.14-15.39 5.207c-.017 2.716 1.326 4.041 2.78 5.477 1.013 1 2.081 2.055 2.78 3.67l.092.076a.34.34 0 0 0 .225.086.34.34 0 0 0 .227-.083l.019-.01c.022-.009.057-.024.074-.064.697-1.6 1.78-2.64 2.814-3.634 1.473-1.414 2.847-2.733 2.864-5.44.02-3.067-2.627-5.58-5.901-5.601m-.057 8.784c1.621.011 2.944-1.315 2.955-2.96.01-1.646-1.295-2.988-2.916-2.999-1.622-.01-2.945 1.315-2.955 2.96s1.295 2.989 2.916 3' style='clip-rule:evenodd;fill:%23e1e3e9;fill-opacity:1;fill-rule:evenodd;stroke:none;stroke-width:2.47727823;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:.4' transform='translate(15.553 2.85)scale(.88807)'/%3E%3Cpath d='M-11.594 15.465c-.27-.002-.492.297-.494.668l-.012 1.876c-.003.371.214.673.485.675l4.14.027c.271.002.492-.298.495-.668l.012-1.877c.003-.37-.215-.672-.485-.674z' style='clip-rule:evenodd;fill:%23fff;fill-opacity:1;fill-rule:evenodd;stroke:none;stroke-width:2.47727823;stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:.4' transform='translate(15.553 2.85)scale(.88807)'/%3E%3C/g%3E%3C/svg%3E")}}.maplibregl-ctrl.maplibregl-ctrl-attrib{background-color:hsla(0,0%,100%,.5);margin:0;padding:0 5px}@media screen{.maplibregl-ctrl-attrib.maplibregl-compact{background-color:#fff;border-radius:12px;box-sizing:content-box;color:#000;margin:10px;min-height:20px;padding:2px 24px 2px 0;position:relative}.maplibregl-ctrl-attrib.maplibregl-compact-show{padding:2px 28px 2px 8px;visibility:visible}.maplibregl-ctrl-bottom-left>.maplibregl-ctrl-attrib.maplibregl-compact-show,.maplibregl-ctrl-top-left>.maplibregl-ctrl-attrib.maplibregl-compact-show{border-radius:12px;padding:2px 8px 2px 28px}.maplibregl-ctrl-attrib.maplibregl-compact .maplibregl-ctrl-attrib-inner{display:none}.maplibregl-ctrl-attrib-button{background-color:hsla(0,0%,100%,.5);background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill-rule='evenodd' viewBox='0 0 20 20'%3E%3Cpath d='M4 10a6 6 0 1 0 12 0 6 6 0 1 0-12 0m5-3a1 1 0 1 0 2 0 1 1 0 1 0-2 0m0 3a1 1 0 1 1 2 0v3a1 1 0 1 1-2 0'/%3E%3C/svg%3E");border:0;border-radius:12px;box-sizing:border-box;cursor:pointer;display:none;height:24px;outline:none;position:absolute;right:0;top:0;width:24px}.maplibregl-ctrl-attrib summary.maplibregl-ctrl-attrib-button{-webkit-appearance:none;-moz-appearance:none;appearance:none;list-style:none}.maplibregl-ctrl-attrib summary.maplibregl-ctrl-attrib-button::-webkit-details-marker{display:none}.maplibregl-ctrl-bottom-left .maplibregl-ctrl-attrib-button,.maplibregl-ctrl-top-left .maplibregl-ctrl-attrib-button{left:0}.maplibregl-ctrl-attrib.maplibregl-compact .maplibregl-ctrl-attrib-button,.maplibregl-ctrl-attrib.maplibregl-compact-show .maplibregl-ctrl-attrib-inner{display:block}.maplibregl-ctrl-attrib.maplibregl-compact-show .maplibregl-ctrl-attrib-button{background-color:rgba(0,0,0,.05)}.maplibregl-ctrl-bottom-right>.maplibregl-ctrl-attrib.maplibregl-compact:after{bottom:0;right:0}.maplibregl-ctrl-top-right>.maplibregl-ctrl-attrib.maplibregl-compact:after{right:0;top:0}.maplibregl-ctrl-top-left>.maplibregl-ctrl-attrib.maplibregl-compact:after{left:0;top:0}.maplibregl-ctrl-bottom-left>.maplibregl-ctrl-attrib.maplibregl-compact:after{bottom:0;left:0}}@media screen and (forced-colors:active){.maplibregl-ctrl-attrib.maplibregl-compact:after{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='%23fff' fill-rule='evenodd' viewBox='0 0 20 20'%3E%3Cpath d='M4 10a6 6 0 1 0 12 0 6 6 0 1 0-12 0m5-3a1 1 0 1 0 2 0 1 1 0 1 0-2 0m0 3a1 1 0 1 1 2 0v3a1 1 0 1 1-2 0'/%3E%3C/svg%3E")}}@media screen and (forced-colors:active) and (prefers-color-scheme:light){.maplibregl-ctrl-attrib.maplibregl-compact:after{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill-rule='evenodd' viewBox='0 0 20 20'%3E%3Cpath d='M4 10a6 6 0 1 0 12 0 6 6 0 1 0-12 0m5-3a1 1 0 1 0 2 0 1 1 0 1 0-2 0m0 3a1 1 0 1 1 2 0v3a1 1 0 1 1-2 0'/%3E%3C/svg%3E")}}.maplibregl-ctrl-attrib a{color:rgba(0,0,0,.75);text-decoration:none}.maplibregl-ctrl-attrib a:hover{color:inherit;text-decoration:underline}.maplibregl-attrib-empty{display:none}.maplibregl-ctrl-scale{background-color:hsla(0,0%,100%,.75);border:2px solid #333;border-top:#333;box-sizing:border-box;color:#333;font-size:10px;padding:0 5px;white-space:nowrap}.maplibregl-popup{display:flex;left:0;pointer-events:none;position:absolute;top:0;will-change:transform}.maplibregl-popup-anchor-top,.maplibregl-popup-anchor-top-left,.maplibregl-popup-anchor-top-right{flex-direction:column}.maplibregl-popup-anchor-bottom,.maplibregl-popup-anchor-bottom-left,.maplibregl-popup-anchor-bottom-right{flex-direction:column-reverse}.maplibregl-popup-anchor-left{flex-direction:row}.maplibregl-popup-anchor-right{flex-direction:row-reverse}.maplibregl-popup-tip{border:10px solid transparent;height:0;width:0;z-index:1}.maplibregl-popup-anchor-top .maplibregl-popup-tip{align-self:center;border-bottom-color:#fff;border-top:none}.maplibregl-popup-anchor-top-left .maplibregl-popup-tip{align-self:flex-start;border-bottom-color:#fff;border-left:none;border-top:none}.maplibregl-popup-anchor-top-right .maplibregl-popup-tip{align-self:flex-end;border-bottom-color:#fff;border-right:none;border-top:none}.maplibregl-popup-anchor-bottom .maplibregl-popup-tip{align-self:center;border-bottom:none;border-top-color:#fff}.maplibregl-popup-anchor-bottom-left .maplibregl-popup-tip{align-self:flex-start;border-bottom:none;border-left:none;border-top-color:#fff}.maplibregl-popup-anchor-bottom-right .maplibregl-popup-tip{align-self:flex-end;border-bottom:none;border-right:none;border-top-color:#fff}.maplibregl-popup-anchor-left .maplibregl-popup-tip{align-self:center;border-left:none;border-right-color:#fff}.maplibregl-popup-anchor-right .maplibregl-popup-tip{align-self:center;border-left-color:#fff;border-right:none}[dir=rtl] .maplibregl-popup-anchor-left{flex-direction:row-reverse}[dir=rtl] .maplibregl-popup-anchor-right{flex-direction:row}[dir=rtl] .maplibregl-popup-anchor-top-left .maplibregl-popup-tip{align-self:flex-end}[dir=rtl] .maplibregl-popup-anchor-top-right .maplibregl-popup-tip{align-self:flex-start}[dir=rtl] .maplibregl-popup-anchor-bottom-left .maplibregl-popup-tip{align-self:flex-end}[dir=rtl] .maplibregl-popup-anchor-bottom-right .maplibregl-popup-tip{align-self:flex-start}.maplibregl-popup-close-button{background-color:transparent;border:0;border-radius:0 3px 0 0;cursor:pointer;position:absolute;right:0;top:0}.maplibregl-popup-close-button:hover{background-color:rgba(0,0,0,.05)}.maplibregl-popup-content{background:#fff;border-radius:3px;box-shadow:0 1px 2px rgba(0,0,0,.1);padding:15px 10px;pointer-events:auto;position:relative}.maplibregl-popup-anchor-top-left .maplibregl-popup-content{border-top-left-radius:0}.maplibregl-popup-anchor-top-right .maplibregl-popup-content{border-top-right-radius:0}.maplibregl-popup-anchor-bottom-left .maplibregl-popup-content{border-bottom-left-radius:0}.maplibregl-popup-anchor-bottom-right .maplibregl-popup-content{border-bottom-right-radius:0}.maplibregl-popup-track-pointer{display:none}.maplibregl-popup-track-pointer *{pointer-events:none;-webkit-user-select:none;-moz-user-select:none;user-select:none}.maplibregl-map:hover .maplibregl-popup-track-pointer{display:flex}.maplibregl-map:active .maplibregl-popup-track-pointer{display:none}.maplibregl-marker{left:0;position:absolute;top:0;transition:opacity .2s;will-change:transform}.maplibregl-user-location-dot,.maplibregl-user-location-dot:before{background-color:#1da1f2;border-radius:50%;height:15px;width:15px}.maplibregl-user-location-dot:before{animation:maplibregl-user-location-dot-pulse 2s infinite;content:"";position:absolute}.maplibregl-user-location-dot:after{border:2px solid #fff;border-radius:50%;box-shadow:0 0 3px rgba(0,0,0,.35);box-sizing:border-box;content:"";height:19px;left:-2px;position:absolute;top:-2px;width:19px}@media (prefers-reduced-motion:reduce){.maplibregl-user-location-dot:before{animation:none}}@keyframes maplibregl-user-location-dot-pulse{0%{opacity:1;transform:scale(1)}70%{opacity:0;transform:scale(3)}to{opacity:0;transform:scale(1)}}.maplibregl-user-location-dot-stale{background-color:#aaa}.maplibregl-user-location-dot-stale:after{display:none}.maplibregl-user-location-accuracy-circle{background-color:#1da1f233;border-radius:100%;height:1px;width:1px}.maplibregl-crosshair,.maplibregl-crosshair .maplibregl-interactive,.maplibregl-crosshair .maplibregl-interactive:active{cursor:crosshair}.maplibregl-boxzoom{background:#fff;border:2px dotted #202020;height:0;left:0;opacity:.5;position:absolute;top:0;width:0}.maplibregl-cooperative-gesture-screen{align-items:center;background:rgba(0,0,0,.4);color:#fff;display:flex;font-size:1.4em;inset:0;justify-content:center;line-height:1.2;opacity:0;padding:1rem;pointer-events:none;position:absolute;transition:opacity 1s ease 1s;z-index:99999}.maplibregl-cooperative-gesture-screen.maplibregl-show{opacity:1;transition:opacity .05s}.maplibregl-cooperative-gesture-screen .maplibregl-mobile-message{display:none}@media (hover:none),(pointer:coarse){.maplibregl-cooperative-gesture-screen .maplibregl-desktop-message{display:none}.maplibregl-cooperative-gesture-screen .maplibregl-mobile-message{display:block}}.maplibregl-pseudo-fullscreen{height:100%!important;left:0!important;position:fixed!important;top:0!important;width:100%!important;z-index:99999}`;

//Visual styles for the main solar overview card. Kept in a dedicated file so
//the card module reads as logic only; rules are grouped by feature
//(layout, timeline, overlays, solar arc, tooltips).
export const solarOverviewCardStyles = css`
  ${unsafeCSS(maplibreCss)}

  :host {
    display: block;
    height: 100%;
  }

  ha-card {
    position: relative;
    overflow: hidden;
    /*  Container query host so the fullscreen / kiosk breakpoint
            rules at the bottom of this stylesheet can react to the
            card's own width without depending on the viewport size,
            which would mis-fire when the user has several solar overview
            cards side by side in a grid view. See issue #33. */
    container-type: inline-size;
    container-name: card;
    /*  Card frame (border, radius, shadow) is provided by the real ha-card
        component so it matches every other card on the page exactly. We only
        keep overflow:hidden above to clip the 3D map to that radius, plus the
        dark background so the clipped corners read as part of the map rather
        than a white sliver. */
    font-family: var(--ha-font-family-body, "Roboto", sans-serif);
    height: 100%;
    width: 100%;
    /*  Floor that survives dashboard layouts where the parent
            doesn't apply an explicit height (vertical-stack, panel
            view, some custom dashboards like Mushroom-based grids).
            Without this floor, height:100% resolves to the children's
            intrinsic height, which means only the timeline chart's
            ~150 px contributes and the 3D map area collapses out of
            view. 480 px leaves the chart its natural height and gives
            the map area ~330 px which is enough to read the home and
            its surroundings. Layouts that DO pass an explicit height
            (masonry via getCardSize, sections view via getGridOptions)
            override this freely.                                       */
    min-height: 480px;
    /*  New stacking context so absolute children with z-index
            stay scoped to the card instead of escaping above HA's
            dashboard chrome on scroll. */
    isolation: isolate;
  }

  #map-container {
    /*  Absolute + inset:0 so the container fills its ha-card
            parent via the containing-block dimensions (which respect
            min-height) rather than via percentage height resolution.
            Percentage heights only cascade when the parent has a
            concrete pixel height, the Masonry dashboard layout sets
            only a min-height floor on the card, so a height:100% here
            would collapse to 0 and the MapLibre canvas would never
            render. Sections and panel views pass a pixel height down,
            so the old percentage path worked there, the absolute path
            works under both.                                          */
    position: absolute;
    inset: 0;
    /*  Round the map (and its WebGL canvas) and clip it, mirroring hui-map-card
        (a WebGL canvas does not inherit an ancestor's border-radius clip in
        every browser). The map sits INSIDE the ha-card's border, so its corner
        radius must be the card radius MINUS the border width, otherwise the
        full-radius corner pokes past the border's inner curve and bleeds. */
    border-radius: calc(
      var(--ha-card-border-radius, var(--ha-border-radius-lg)) - var(
          --ha-card-border-width,
          1px
        )
    );
    overflow: hidden;
    /*  clip-path actually truncates the WebGL viewport to the rounded shape.
        border-radius + overflow alone is ignored by the MapLibre canvas in some
        browsers (Safari especially), which is what made the corners bleed. */
    clip-path: inset(
      0 round
        calc(
          var(--ha-card-border-radius, var(--ha-border-radius-lg)) - var(
              --ha-card-border-width,
              1px
            )
        )
    );
  }

  /*  Clip the MapLibre WebGL canvas itself. A <canvas> is a replaced element,
      so border-radius clips its rendered bitmap with anti-aliasing, which an
      ancestor's overflow/clip-path does NOT reliably do for a compositor-owned
      WebGL surface. This is what stops the square canvas corner poking past the
      card's rounded frame. */
  .maplibregl-map,
  .maplibregl-canvas-container,
  .maplibregl-canvas {
    border-radius: calc(
      var(--ha-card-border-radius, var(--ha-border-radius-lg)) - var(
          --ha-card-border-width,
          1px
        )
    );
  }

  /*  Force-hide the MapLibre attribution rail. attributionControl
        compact: true is meant to collapse it to an icon, but MapLibre
        auto-expands the full bar above 640 px viewport width which
        most dashboard cards exceed. We hide it outright via CSS, the
        attribution credit (MapLibre + OpenFreeMap + OpenMapTiles +
        OpenStreetMap data) lives in the README and the HACS info pane
        so the license obligation stays satisfied through documentation
        rather than chrome real estate. */
  .maplibregl-ctrl-attrib,
  .maplibregl-ctrl-bottom-right,
  .maplibregl-ctrl-bottom-left {
    display: none !important;
  }
  /*  Camera-locked cursor: drop the MapLibre grab cursor when the user has the camera
        pinned. drag pan + drag rotate are both disabled in the locked state, so the open-hand
        cursor was advertising an interaction that does not exist. MapLibre sets the cursor
        inline on the canvas, so the override needs !important to bite. */
  ha-card.camera-locked .maplibregl-canvas-container,
  ha-card.camera-locked .maplibregl-canvas {
    cursor: default !important;
  }

  /*  Home hitbox, invisible circular click target centred on the
        home's projected screen position. Sits above every overlay
        SVG (z 12) so a click
        always reaches it, regardless of which chip / leader happens
        to sit underneath at that moment. */
  /*  Home click target. Sized to comfortably overlap the 3D
        building silhouette on a typical residential footprint
        (40-50 m at home altitude after the projection), and z-index
        bumped above every chip + leader cluster so the click reliably
        lands on the home regardless of which decoration happens to
        sit under the pointer at that moment.                       */
  .home-hitbox {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: transparent;
    cursor: pointer;
    pointer-events: auto;
    z-index: 55;
  }

  /*  Home hover glow. Base + top + side-quad polygons projected from
        the building extrusion (so it tracks rotation pixel-for-pixel
        with it), painted in the configured sun colour
        with a CSS drop-shadow bloom. Opacity is the only thing that
        animates so the fade is GPU-cheap, the geometry comes back
        every frame from the engine without re-rendering this SVG. */
  .home-glow-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    /*  The SVG itself stays click-transparent so empty pixels
            don't capture clicks meant for chips behind it; only the
            painted polygons (the home-glow-shape rule below) receive
            pointer events. cursor: pointer makes the silhouette
            read as interactive on hover. */
    pointer-events: none;
    cursor: pointer;
    /*  Sits ABOVE the basemap + buildings but BELOW the home chip
            cluster (z 8) so the hover glow + production pulse never
            cross over the PV / battery / grid / cloud / solar value
            chips. The chips always win on the shared pixels. */
    z-index: 6;
    /*  Resting opacity is a faint 0.25 so the home silhouette stays discoverable on the
            basemap even in busy mixed-building neighbourhoods. Hover bumps to 0.85 for an
            unmistakable interactive cue; the drop-shadow stays modest at rest and ramps up on
            hover via a heavier filter rule.                                                   */
    opacity: 0.25;
    transition:
      opacity 0.18s ease,
      filter 0.18s ease;
    filter: drop-shadow(0 0 4px var(--primary-color, #03a9f4));
  }
  .home-glow-svg.is-hovered {
    opacity: 0.85;
    filter: drop-shadow(0 0 8px var(--primary-color, #03a9f4));
  }

  /*  Touch devices have no hover state, mouseenter / mouseleave
        never fire, so the .is-hovered class is never applied. Show
        the glow permanently at a softer opacity so the user still
        gets a visual hint that the home is tappable. The overlay-mask
        fade rule (specificity 0,2,0) wins over this (0,1,0)
        so the glow still fades out when a non-base mode opens. */
  @media (hover: none) {
    .home-glow-svg {
      opacity: 0.45;
    }
  }
  .home-glow-svg .home-glow-shape {
    /*  Translucent HA primary-color halo painted ONLY on hover
            (the parent SVG controls opacity); the home base identity
            colour lives on the 3D fill-extrusion in _addBuildings(). */
    fill: var(--primary-color, #03a9f4);
    fill-opacity: 0.08;
    stroke: var(--primary-color, #03a9f4);
    stroke-width: 1;
    stroke-linejoin: round;
    /*  Painted polygons capture clicks so the silhouette's actual shape becomes the hit
            zone. The 120 px circular hitbox below only covers the centre, and on larger /
            zoomed-in buildings the corners stick out past it; visiblePainted reads the painted
            footprint and catches clicks anywhere on the visible roof. */
    pointer-events: visiblePainted;
  }

  /*  When a non-base mode is active, fade out every overlay layer
        via the shared .overlay-masked class. The toggle button
        itself is opted back in (selector below) so the user can
        always exit. The map container stays visible. */
  /*  Base transition + composite-layer hint kept on the unprefixed selectors so the fade
        runs in BOTH directions across every browser. The will-change: opacity hint promotes
        each element to its own composite layer so the GPU drives the alpha sweep instead of
        asking the painter to redo layout per frame, which would otherwise drop frames on the
        chips that sit inside transform-less wrappers (time-bar, solar-svg).                  */
  .home-glow-svg,
  .home-hitbox,
  .solar-svg,
  .solar-pct-label,
  .pv-home-leader-svg,
  .pv-pct-label,
  .battery-leader-svg,
  .battery-pct-label,
  .grid-leader-svg,
  .grid-label,
  .low-carbon-leader-svg,
  .low-carbon-label,
  .home-pill {
    transition: opacity 0.35s ease;
  }
  /*  will-change opt-in: scope the composite-layer promotion to the transition windows only.
        Declaring will-change: opacity unconditionally on 15+ elements pins that many GPU layers
        in idle VRAM (~15-30 MB on devices with limited budgets) and forces the compositor to
        re-sync them on every Lit re-render. Promote only when a mode actually toggles, gated
        on ha-card.overlay-masked, which is set on every non-base _cardMode. */
  ha-card.overlay-masked .home-glow-svg,
  ha-card.overlay-masked .home-hitbox,
  ha-card.overlay-masked .solar-svg,
  ha-card.overlay-masked .solar-pct-label,
  ha-card.overlay-masked .pv-home-leader-svg,
  ha-card.overlay-masked .pv-pct-label,
  ha-card.overlay-masked .battery-leader-svg,
  ha-card.overlay-masked .battery-pct-label,
  ha-card.overlay-masked .grid-leader-svg,
  ha-card.overlay-masked .grid-label,
  ha-card.overlay-masked .low-carbon-leader-svg,
  ha-card.overlay-masked .low-carbon-label,
  ha-card.overlay-masked .home-pill {
    will-change: opacity;
  }
  /*  Chips + leaders + arcs fade out behind any non-base mode (weather).
        Single rule keyed on the overlay-masked class so the state machine on the card side
        controls exactly when the fade kicks in either direction. */
  ha-card.overlay-masked .home-glow-svg,
  ha-card.overlay-masked .home-hitbox,
  ha-card.overlay-masked .solar-svg,
  ha-card.overlay-masked .solar-pct-label,
  ha-card.overlay-masked .pv-home-leader-svg,
  ha-card.overlay-masked .pv-pct-label,
  ha-card.overlay-masked .battery-leader-svg,
  ha-card.overlay-masked .battery-pct-label,
  ha-card.overlay-masked .grid-leader-svg,
  ha-card.overlay-masked .grid-label,
  ha-card.overlay-masked .low-carbon-leader-svg,
  ha-card.overlay-masked .low-carbon-label {
    opacity: 0;
    pointer-events: none;
  }
  /*  home-pill hides on every masked mode, weather included: in weather mode the
        dedicated glow home button (sol-weather-home) replaces it. The hide is INSTANT
        in weather mode (transition:none) so the old pill never lingers a few frames
        over the appearing return button; on exit the default 0.35s opacity transition
        above fades it back in. */
  ha-card.overlay-masked .home-pill {
    opacity: 0;
    pointer-events: none;
  }
  ha-card.mode-weather .home-pill {
    transition: none;
  }

  /*  Cloud-cover toggle button. iOS-friendly 40 px touch target,
        icon-only with a title tooltip; the on state takes the brand
        primary plate so the user has one consistent
        visual language for "you are in a non-default mode".
        Segments are glued together via shared borders and
        matching corner radii.                                    */
  /*  HA ha-icon-button-style toggles: each segment is a transparent
        circle that holds the icon, an active or hover state lights
        up the circle in the brand colour. Same visual vocabulary as
        the HA dashboard toolbar buttons so a solar overview card dropped
        into a HA Energy dashboard reads as part of the toolbar
        family. */
  /*  Top corner overlays. Camera-lock + scrub-return on the left,
        cloud-cover toggle on the right. Both rails are flex rows
        sitting 8 px from their card edge.                          */

  /*  Date/time chip, same chip language as the on-map readouts.
        Explicit height (border-box) so the chip and the back-to-
        live button next to it share the exact same vertical
        footprint, no align-items: center shift in the parent flex
        container. */
  /*  Global crisp-text rule for every chip rendered with a
        translate centred on the home anchor. Without this rule
        Safari and Chrome land the chip at a fractional pixel
        (50 % anchor + -50 % translate) which softens the glyph
        edges. text-rendering: geometricPrecision + antialiased
        smoothing keeps the text sharp at any sub-pixel offset. */
  .pv-pct-label,
  .battery-pct-label,
  .solar-pct-label {
    text-rendering: geometricPrecision;
    -webkit-font-smoothing: antialiased;
  }

  /*  Loading banner. Shown at the top of the card while the first hydration wave of data fetches
        is still in flight (PV, battery, grid, solar radiation, daily totals, weather, buildings).
        Retires for the rest of the card lifetime once every started phase has finished
        once, so routine background refreshes (mode switches, scrub, time tick) do NOT bring it
        back. Rounded card, themed bg + border + shadow so the user reads it as part of the rest
        of the HUD chrome. Slide-in from the top + opacity, slide-out downwards via the same pure
        CSS transition pattern (no keyframes, no animation: forwards). Sits above the timeline +
        mode bar at z-index 60. */
  /*  Weather mode renders inside MapLibre via a GL custom layer (see
        src/engine/weather-cloud-layer.ts), no DOM overlay any more, no per-cell SVG. */

  /*  Photovoltaic production chip, same frame as cloud/W/m² but
        tinted in the user-configured production colour (border +
        text + icon) for instant identification.
        --pv-leader-color is set inline by the renderer. The
        min-width / centred text are shared with the SoC and Power
        battery chips so the visible gap on each side of the PV
        chip is identical regardless of how wide each value reads
        ("26 %" vs "+12.34 kW" otherwise produce visibly unequal
        leader gaps). */
  /*  PV production chip. Compact horizontal pill so it does not
        crowd the map (HA-energy-shaped 76 x 76 nodes read too heavy
        at the card's native zoom). The HA-energy identity stays via
        the coloured ring + icon glyph + ink tokens, the shape stays
        compact. */
  .pv-pct-label {
    position: absolute;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 8;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-width: 76px;
    box-sizing: border-box;
    background: var(--card-background-color, #ffffff);
    color: var(--primary-text-color, #212121);
    border: 2px solid var(--pv-leader-color, var(--energy-solar-color, #ff9800));
    border-radius: 999px;
    padding: 3px 10px;
    font-size: var(--ha-font-size-s, 12px);
    font-weight: 600;
    line-height: 1.2;
    font-variant-numeric: tabular-nums;
    box-shadow: 0 1px 3px var(--shadow-color);
    white-space: nowrap;
  }

  .pv-pct-label ha-icon {
    --mdc-icon-size: 16px;
    color: inherit;
    display: inline-flex;
    align-items: center;
  }

  /*  Predicted PV chip, shown when scrubbing into the future. The
        value comes from the kWp × clear-sky model, not a measured
        reading, so we semi-transparency the whole chip and rely on
        the leading "≈" character (set by the card's render) to
        signal "estimate" textually. */
  .pv-pct-label.is-predicted {
    opacity: 0.55;
    font-style: italic;
  }

  /*  Battery SoC and Power chips, same compact pill recipe as the
        PV chip. HA-energy node identity is carried by the coloured
        ring, the icon and the ink tokens, the shape stays compact so
        it does not crowd the map. */
  .battery-pct-label {
    position: absolute;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 8;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-width: 76px;
    box-sizing: border-box;
    background: var(--card-background-color, #ffffff);
    color: var(--primary-text-color, #212121);
    border: 2px solid
      var(--battery-leader-color, var(--energy-battery-out-color, #4db6ac));
    border-radius: 999px;
    padding: 3px 10px;
    font-size: var(--ha-font-size-s, 12px);
    font-weight: 600;
    line-height: 1.2;
    font-variant-numeric: tabular-nums;
    box-shadow: 0 1px 3px var(--shadow-color);
    white-space: nowrap;
  }

  .battery-pct-label ha-icon {
    --mdc-icon-size: 16px;
    color: inherit;
    display: inline-flex;
    align-items: center;
  }

  /*  Grid chip: same compact single-line pill recipe as the PV and
        battery chips, so its text stays crisp under camera rotation.
        It shows the active flow only; the border follows the inline
        --grid-leader-color the renderer resolves (consumption blue
        while importing, return purple while exporting), the icon +
        value flip with it. */
  .grid-label {
    position: absolute;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 8;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-width: 76px;
    box-sizing: border-box;
    background: var(--card-background-color, #ffffff);
    color: var(--primary-text-color, #212121);
    border: 2px solid
      var(--grid-leader-color, var(--energy-grid-consumption-color, #488fc2));
    border-radius: 999px;
    padding: 3px 10px;
    font-size: var(--ha-font-size-s, 12px);
    font-weight: 600;
    line-height: 1.2;
    font-variant-numeric: tabular-nums;
    box-shadow: 0 1px 3px var(--shadow-color);
    white-space: nowrap;
    text-rendering: geometricPrecision;
    -webkit-font-smoothing: antialiased;
  }
  .grid-label ha-icon {
    --mdc-icon-size: 16px;
    color: inherit;
    display: inline-flex;
    align-items: center;
  }

  /*  Every chip leader SVG is a full-bleed transparent overlay; the line + bead
      inside it carry the per-direction colour. */
  .grid-leader-svg,
  .low-carbon-leader-svg,
  .pv-home-leader-svg,
  .battery-leader-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 5;
  }
  /*  Single grid leader. Stroke + bead fill come from the inline
        --grid-leader-color the renderer resolves to the dominant flow,
        so one path serves both import (blue) and export (purple). */
  .grid-leader-line {
    stroke-width: 1;
    stroke-linecap: round;
    fill: none;
  }

  /*  Low-carbon chip: same single-line pill recipe as the others,
        tinted in HA's non-fossil green. Sits at the top of the left
        column and feeds the grid chip below it. */
  .low-carbon-label {
    position: absolute;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 8;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-width: 76px;
    box-sizing: border-box;
    background: var(--card-background-color, #ffffff);
    color: var(--primary-text-color, #212121);
    border: 2px solid
      var(--low-carbon-color, var(--energy-non-fossil-color, #0f9d58));
    border-radius: 999px;
    padding: 3px 10px;
    font-size: var(--ha-font-size-s, 12px);
    font-weight: 600;
    line-height: 1.2;
    font-variant-numeric: tabular-nums;
    box-shadow: 0 1px 3px var(--shadow-color);
    white-space: nowrap;
    text-rendering: geometricPrecision;
    -webkit-font-smoothing: antialiased;
  }
  .low-carbon-label ha-icon {
    --mdc-icon-size: 16px;
    color: inherit;
    display: inline-flex;
    align-items: center;
  }
  /*  Low-carbon → grid leader: a straight vertical hairline (no L,
        the two chips share the column x). Stroke + bead fill come from
        the inline --low-carbon-color. */
  .low-carbon-leader-line {
    stroke-width: 1;
    stroke-linecap: round;
    fill: none;
  }

  /*  PV → home leader. Vertical dashed line from the PV chip's
        bottom edge down to the home marker, painted in the configured
        PV colour. Same dash vocabulary as the battery leader so the
        two flows read as one coherent visual language. Animation runs
        only when current production is positive; idle state keeps the
        line static. Sits at z 5, BELOW the chip cluster (z 6) so the
        dashes pass behind the PV / SoC / Power chips. */
  .pv-home-leader-line {
    stroke: var(--pv-leader-color, var(--energy-solar-color, #ff9800));
    stroke-width: 1;
    stroke-opacity: 1;
    stroke-linecap: round;
    fill: none;
  }

  /*  Moving beads (PV→home + battery leaders): a small filled disc rides the leader
        at a speed proportional to live flow, with a card-coloured halo ring so it
        reads against any leader colour. Same vocabulary as the HA energy-distribution
        card. */
  .pv-home-leader-bead,
  .battery-leader-bead {
    opacity: 0.95;
    stroke: var(--card-background-color, #ffffff);
    stroke-width: 1;
    stroke-opacity: 0.85;
    paint-order: stroke fill;
  }
  ha-card.theme-dark .pv-home-leader-bead,
  ha-card.theme-dark .battery-leader-bead {
    stroke: var(--card-background-color, #191a1b);
    stroke-opacity: 0.95;
  }

  /*  Battery leaders.
        Both SoC ↔ PV and PV ↔ Power share the exact same visual
        vocabulary: solid L-shaped path with a rounded fillet at
        the bend, matching the Home Assistant energy-distribution
        card. The PV ↔ Power leader carries a small filled bead
        riding along the path (animateMotion in card.ts) at a
        speed proportional to |P|; the bead's path is flipped
        inline by the renderer when discharging so its travel
        direction matches the energy flow. The SoC leader is
        static, no bead: SoC is a level, not a flow. */
  .battery-leader-line {
    stroke: var(
      --battery-leader-color,
      var(--energy-battery-out-color, #4db6ac)
    );
    stroke-width: 1;
    stroke-opacity: 1;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
  }

  /*  Solar overlay, split into two passes so chips never occlude
        the live sun while the night portion of the loop still reads
        as background:
          - .solar-svg-back paints only the dotted below-horizon
            segments and stacks BELOW the home chip cluster (z 4)
            so the home + readouts sit clearly on top of the night
            half of the orbit.
          - .solar-svg-front paints the above-horizon arc, the
            incidence ray, and the sun disc, and stacks ABOVE the
            chips (z 7) so the live sun always dominates the stack.
            This is a solar overview card, the sun must win the stack. */
  .solar-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    /* Daylight fade is fed via the --solar-daylight CSS variable
           (set inline per render, ranges 0..1) instead of an inline
           opacity, so the overlay-mask fade rule can win
           cleanly without fighting an inline style. */
    opacity: var(--solar-daylight, 1);
    transition: opacity 600ms ease-out;
  }
  /*  Central home pill, a circular node painted at the projected
        home centre. Every chip leader (PV, battery, grid) docks
        against its border so the home reads as the single energy
        hub the way HA's Energy distribution card does.            */
  .home-pill {
    position: absolute;
    width: 52px;
    height: 52px;
    transform: translate(-50%, -50%);
    background: var(--card-background-color, #ffffff);
    border: 2px solid var(--primary-color, #03a9f4);
    border-radius: 50%;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0px;
    z-index: 9;
    pointer-events: none;
    box-shadow: 0 1px 3px var(--shadow-color);
    color: var(--primary-color, #03a9f4);
    /*  Keep the mask fade AND ease the hover glow in/out. */
    transition:
      opacity 0.35s ease,
      box-shadow 0.2s ease;
  }
  /*  Very light glow on home hover: a soft halo in the primary colour,
        the hover state is driven from the hitbox by the card. */
  .home-pill.is-hovered {
    box-shadow:
      0 1px 3px var(--shadow-color),
      0 0 7px 1px
        color-mix(in srgb, var(--primary-color, #03a9f4) 28%, transparent);
  }
  .home-pill ha-icon {
    --mdc-icon-size: 20px;
    color: inherit;
    display: inline-flex;
    align-items: center;
  }
  /*  With the consumption line present the home glyph shrinks so both
        lines breathe inside the circle. */
  .home-pill.has-usage ha-icon {
    --mdc-icon-size: 15px;
  }
  /*  Live home consumption, second line inside the hub. Same text
        size as the surrounding chips so the cluster reads uniform;
        tabular figures keep the digits steady, regular text ink keeps
        it readable against the card background. */
  .home-pill-usage {
    font-size: var(--ha-font-size-s, 12px);
    font-weight: 700;
    line-height: 1.1;
    color: var(--primary-text-color, #212121);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    letter-spacing: -0.2px;
    /*  Phantom space below the value so the centred icon + value block
            sits a touch higher in the circle (raises the visible content by
            half this margin without changing the pill size). */
    margin-bottom: 8px;
  }

  .solar-svg-back {
    z-index: 4;
  }
  /*  Above-horizon arc is rendered in TWO passes so the depth of
        each segment drives the local z-order around the home cluster:
          - solar-svg-front-far  (z 5)  : the half of the arc that has
            already arched away from the camera. Sits BEHIND chips
            (z 8), leaders (z 5..), pill (z 9); reads as "the arc
            disappears behind the home".
          - solar-svg-front-near (z 11) : the half closest to the
            camera. Sits IN FRONT of chips + leaders so the arc reads
            as "coming over the top of the home" on its near side.
        Sun disc (z 12) and the W/m^2 chip (z 13) always paint last.  */
  .solar-svg-front-far {
    z-index: 5;
  }
  .solar-svg-front-near {
    z-index: 11;
  }
  /*  Sun disc inherits the same depth split as the arc:
        - far half of the loop : disc paints UNDER chips + leaders
          (z 5) so the sun "passes behind the home" as the loop
          arcs away from the camera.
        - near half of the loop : disc paints OVER everything but
          the W/m^2 chip (z 12).                                  */
  .solar-svg-sun-far {
    z-index: 5;
  }
  .solar-svg-sun-near {
    z-index: 12;
  }
  /*  Sun -> PV ray + bead live on their own SVG below the chip
        family (pv-pct-label sits at z 8) so the chip's background
        always occludes the ray endpoint at the chip border. The
        sun disc itself stays in the depth-split SVGs above so the
        disc still passes in front of / behind the home cluster
        depending on camera bearing. */
  .solar-ray-svg {
    z-index: 7;
  }

  /*  Arc, first pass paints a dark outline for legibility on
        light basemaps; second pass paints the configured sun
        colour on top. Stroke widths are set inline per segment. */
  .solar-svg .solar-arc-outline {
    stroke: rgba(0, 0, 0, 0.35);
    stroke-linecap: round;
  }
  .solar-svg .solar-arc-segment {
    stroke-linecap: round;
  }

  /*  Below-horizon segments, round dots at fixed spacing so the eye reads "this is happening
        underground" without colour or depth scaling having to carry the signal. dasharray "0 N"
        with linecap round renders true circles on every browser. Stroke alpha is halved relative
        to the above-horizon arc so the dotted leg recedes visually: the bright arc reads as
        "the part of the day where there is sunlight" and the dotted leg as ambient context
        underneath.                                                                              */
  .solar-svg .solar-arc-night {
    stroke-linecap: round;
    stroke-dasharray: 0 8;
    stroke-opacity: 0.45;
  }
  .solar-svg .solar-arc-night.solar-arc-outline {
    stroke-opacity: 0.25;
  }

  /*  Incidence ray, dashes flow from the sun toward the home at a
        speed proportional to live irradiance. Hairline 1 px to match
        the home cluster's solid leaders so the whole connector family
        reads at one weight. */
  .solar-svg .solar-ray {
    stroke-width: 1;
    stroke-dasharray: 5 5;
    stroke-opacity: 0.55;
    stroke-linecap: round;
    animation: solar-ray-flow var(--sun-flow-duration, 30s) linear infinite;
  }

  @keyframes solar-ray-flow {
    from {
      stroke-dashoffset: 0;
    }
    to {
      stroke-dashoffset: -10;
    }
  }

  /*  Solar ray bead, small filled disc travelling sun -> PV chip
        along the incidence ray. Same recipe as the PV / battery /
        grid beads (white halo stroke, paint-order stroke-fill, dark
        halo in theme-dark) so the bead family reads consistently
        across all leaders. Speed comes from the inline animateMotion
        dur value driven by the live irradiance.                    */
  .solar-svg .solar-ray-bead {
    opacity: 0.95;
    stroke: var(--card-background-color, #ffffff);
    stroke-width: 1;
    stroke-opacity: 0.85;
    paint-order: stroke fill;
  }
  ha-card.theme-dark .solar-svg .solar-ray-bead {
    stroke: var(--card-background-color, #191a1b);
    stroke-opacity: 0.95;
  }

  /*  Solar irradiance label, chip pinned above the live sun
        position, same chip language as the cloud and PV chips.
        Sits in the front layer (z 7) so it stacks on top of every
        home-anchored chip, matching the front-pass solar overlay. */
  .solar-pct-label {
    position: absolute;
    transform: translate(-50%, -100%);
    pointer-events: none;
    /*  Sits ABOVE the arc-front lines (z 11) so the W/m² readout
            never gets crossed over by an arc segment that happens
            to project through its area. The sun disc (z 12) still
            paints on top because it shares the cluster identity. */
    z-index: 13;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: var(--card-background-color, #ffffff);
    color: var(--primary-text-color, #212121);
    /*  Sun chip uses the HA amber token so the live irradiance
            reads distinct from the PV production identity. PV stays
            on --energy-solar-color (orange); the sun stays on amber
            so the two never blur visually. */
    border: 2px solid
      var(--sun-color, var(--amber-color, var(--warning-color, #ffc107)));
    border-radius: 999px;
    padding: 3px 10px;
    font-size: var(--ha-font-size-s, 12px);
    font-weight: 600;
    line-height: 1.2;
    font-variant-numeric: tabular-nums;
    box-shadow: 0 1px 3px var(--shadow-color);
    white-space: nowrap;
  }

  .solar-pct-label ha-icon {
    --mdc-icon-size: 16px;
    color: inherit;
    display: inline-flex;
    align-items: center;
  }

  /*  ============================================================
        Dark theme, opt-in via the \`card-theme: dark\` config.

        The whole card is already painted on top of a 3D map, so
        "dark mode" here is really about the chrome (chips, charts,
        cursors, day labels, leader lines, tooltips), the basemap
        keeps its own colours. Strategy:

          - chip surfaces flip from a solid white plate to a solid
            near-black plate, so the chip itself reads as a clean
            darkened tile over the map instead of a
            bright sticker.
          - chip text / borders / icons go from black to a soft
            light-grey (#e6e6e6 text, #cccccc borders), pure white
            would clip detail against bright basemap patches.
          - chart hairlines (midline, day separators, hour ticks,
            live cursor) flip from black-on-white to white-on-near-
            black with the same opacity envelopes as the light skin
            so the visual weight stays balanced.
          - chart fills (PV / cloud / irradiance) are user-coloured
            and unchanged, they read fine on both surfaces.
          - the scrub blue (#1f6feb) and the live tooltip dark
            plate already read on dark backgrounds, so they're left
            alone.
        ============================================================ */

  /*  tb-cursor-now is driven by --rgb-primary-text-color + alpha
        so it flips with the theme on its own, no dark overrides
        needed. */

  /*  Value chips (PV, battery, cloud, solar) sit on a dark plate
        with a thick coloured ring in BOTH themes, matching the visual
        language of Home Assistant's energy dashboard so a solar overview card
        sitting alongside HA's own surfaces reads as part of the same
        family. The plate is opaque enough to stay readable over a
        bright basemap in light mode without us forking the recipe
        per theme. */

  /*  Cloud leader keeps its slate-blue colour in dark mode too,
        the chip's frame already carries the same colour on both
        themes so the leader matches by default. */

  /*  Solar arc outline, the light skin paints a black halo
        behind the configured sun colour for legibility on bright
        basemaps; in dark mode that halo would disappear into the
        map, so we paint a faint white halo instead. The arc and
        sun disc themselves keep their configured colour. */
  ha-card.theme-dark .solar-svg .solar-arc-outline {
    stroke: rgba(255, 255, 255, 0.45);
  }

  /*  ---------------------------------------------------------
        Animation perf hooks
        ---------------------------------------------------------

        1. .paused, set on the host element by the card's
           IntersectionObserver when the card scrolls out of the
           viewport. Pauses every CSS animation (SVG dash-flow,
           offset-path arrow flow) until the card returns. SMIL
           <animateMotion> is paused in parallel via
           svg.pauseAnimations() in the card script.

        2. prefers-reduced-motion, respects the user's system
           setting. When the user has asked for reduced motion at
           the OS level, every card animation and transition is
           disabled. The card still functions; it just doesn't move.
    */
  :host(.paused) *,
  :host(.paused) *::before,
  :host(.paused) *::after {
    animation-play-state: paused !important;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0ms !important;
    }
  }

  /*  Fullscreen / kiosk breakpoint, see issue #33. When the card
        is rendered above 900 CSS px of width (a dedicated dashboard
        view, kiosk panel, mobile portrait on tablet, ...), the chip
        text bumps one size step up so the value chips, the day-strip
        and the W/m² readout stay readable from across the room.

        The sun arc radius and the home chip cluster offsets are
        scaled separately by the engine (_chipSpreadScale), so the
        on-map geometry expands in lockstep with this typography pass
        without overlapping the chip text.

        Container queries on ha-card (declared above) so a solar overview
        card sitting in a wide section view alongside narrower cards
        flips on its own width, not on the viewport's. */
  @container card (min-width: 900px) {
    .pv-pct-label,
    .battery-pct-label,
    .grid-label,
    .low-carbon-label,
    .solar-pct-label {
      font-size: var(--ha-font-size-m, 14px);
      padding: 4px 12px;
    }
    .pv-pct-label ha-icon,
    .battery-pct-label ha-icon,
    .grid-label ha-icon,
    .low-carbon-label ha-icon,
    .solar-pct-label ha-icon {
      --mdc-icon-size: 18px;
    }
  }
`;
