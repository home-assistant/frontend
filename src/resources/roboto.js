const documentContainer = document.createElement("template");
documentContainer.setAttribute("style", "display: none;");

documentContainer.innerHTML = `<style>
@font-face {
font-family: "Roboto";
src:
  local("Roboto Thin"),
  local("Roboto-Thin"),
  url(/static/fonts/roboto/Roboto-Thin.woff2) format("woff2");
font-weight: 100;
font-style: normal;
}
@font-face {
font-family: "Roboto";
src:
  local("Roboto Thin Italic"),
  local("Roboto-ThinItalic"),
  url(/static/fonts/roboto/Roboto-ThinItalic.woff2) format("woff2");
font-weight: 100;
font-style: italic;
}
@font-face {
font-family: "Roboto";
src:
  local("Roboto Light"),
  local("Roboto-Light"),
  url(/static/fonts/roboto/Roboto-Light.woff2) format("woff2");
font-weight: 300;
font-style: normal;
}
@font-face {
font-family: "Roboto";
src:
  local("Roboto Light Italic"),
  local("Roboto-LightItalic"),
  url(/static/fonts/roboto/Roboto-LightItalic.woff2) format("woff2");
font-weight: 300;
font-style: italic;
}
@font-face {
font-family: "Roboto";
src:
  local("Roboto Regular"),
  local("Roboto-Regular"),
  url(/static/fonts/roboto/Roboto-Regular.woff2) format("woff2");
font-weight: 400;
font-style: normal;
}
@font-face {
font-family: "Roboto";
src:
  local("Roboto Italic"),
  local("Roboto-Italic"),
  url(/static/fonts/roboto/Roboto-RegularItalic.woff2) format("woff2");
font-weight: 400;
font-style: italic;
}
@font-face {
font-family: "Roboto";
src:
  local("Roboto Medium"),
  local("Roboto-Medium"),
  url(/static/fonts/roboto/Roboto-Medium.woff2) format("woff2");
font-weight: 500;
font-style: normal;
}
@font-face {
font-family: "Roboto";
src:
  local("Roboto Medium Italic"),
  local("Roboto-MediumItalic"),
  url(/static/fonts/roboto/Roboto-MediumItalic.woff2) format("woff2");
font-weight: 500;
font-style: italic;
}
@font-face {
font-family: "Roboto";
src:
  local("Roboto Bold"),
  local("Roboto-Bold"),
  url(/static/fonts/roboto/Roboto-Bold.woff2) format("woff2");
font-weight: 700;
font-style: normal;
}
@font-face {
font-family: "Roboto";
src:
  local("Roboto Bold Italic"),
  local("Roboto-BoldItalic"),
  url(/static/fonts/roboto/Roboto-BoldItalic.woff2) format("woff2");
font-weight: 700;
font-style: italic;
}
@font-face {
font-family: "Roboto";
src:
  local("Roboto Black"),
  local("Roboto-Black"),
  url(/static/fonts/roboto/Roboto-Black.woff2) format("woff2");
font-weight: 900;
font-style: normal;
}
@font-face {
font-family: "Roboto";
src:
  local("Roboto Black Italic"),
  local("Roboto-BlackItalic"),
  url(/static/fonts/roboto/Roboto-BlackItalic.woff2) format("woff2");
font-weight: 900;
font-style: italic;
}
</style>`;

document.head.appendChild(documentContainer.content);

/**
@license
Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/
/*
  FIXME(polymer-modulizer): the above comments were extracted
  from HTML and may be out of place here. Review them and
  then delete this comment!
*/
