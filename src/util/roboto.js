const documentContainer = document.createElement('template');
documentContainer.setAttribute('style', 'display: none;');

documentContainer.innerHTML = `<style>
@font-face {
font-family: "Roboto";
src: url(/static/fonts/roboto/Roboto-Thin.ttf) format("truetype");
font-weight: 100;
font-style: normal;
}
@font-face {
font-family: "Roboto";
src: url(/static/fonts/roboto/Roboto-ThinItalic.ttf) format("truetype");
font-weight: 100;
font-style: italic;
}
@font-face {
font-family: "Roboto";
src: url(/static/fonts/roboto/Roboto-Light.ttf) format("truetype");
font-weight: 300;
font-style: normal;
}
@font-face {
font-family: "Roboto";
src: url(/static/fonts/roboto/Roboto-LightItalic.ttf) format("truetype");
font-weight: 300;
font-style: italic;
}
@font-face {
font-family: "Roboto";
src: url(/static/fonts/roboto/Roboto-Regular.ttf) format("truetype");
font-weight: 400;
font-style: normal;
}
@font-face {
font-family: "Roboto";
src: url(/static/fonts/roboto/Roboto-Italic.ttf) format("truetype");
font-weight: 400;
font-style: italic;
}
@font-face {
font-family: "Roboto";
src: url(/static/fonts/roboto/Roboto-Medium.ttf) format("truetype");
font-weight: 500;
font-style: normal;
}
@font-face {
font-family: "Roboto";
src: url(/static/fonts/roboto/Roboto-MediumItalic.ttf) format("truetype");
font-weight: 500;
font-style: italic;
}
@font-face {
font-family: "Roboto";
src: url(/static/fonts/roboto/Roboto-Bold.ttf) format("truetype");
font-weight: 700;
font-style: normal;
}
@font-face {
font-family: "Roboto";
src: url(/static/fonts/roboto/Roboto-BoldItalic.ttf) format("truetype");
font-weight: 700;
font-style: italic;
}
@font-face {
font-family: "Roboto";
src: url(/static/fonts/roboto/Roboto-Black.ttf) format("truetype");
font-weight: 900;
font-style: normal;
}
@font-face {
font-family: "Roboto";
src: url(/static/fonts/roboto/Roboto-BlackItalic.ttf) format("truetype");
font-weight: 900;
font-style: italic;
}
@font-face {
font-family: "Roboto Mono";
src: url(/static/fonts/robotomono/RobotoMono-Thin.ttf) format("truetype");
font-weight: 100;
font-style: normal;
}
@font-face {
font-family: "Roboto Mono";
src: url(/static/fonts/robotomono/RobotoMono-ThinItalic.ttf) format("truetype");
font-weight: 100;
font-style: italic;
}
@font-face {
font-family: "Roboto Mono";
src: url(/static/fonts/robotomono/RobotoMono-Light.ttf) format("truetype");
font-weight: 300;
font-style: normal;
}
@font-face {
font-family: "Roboto Mono";
src: url(/static/fonts/robotomono/RobotoMono-LightItalic.ttf) format("truetype");
font-weight: 300;
font-style: italic;
}
@font-face {
font-family: "Roboto Mono";
src: url(/static/fonts/robotomono/RobotoMono-Regular.ttf) format("truetype");
font-weight: 400;
font-style: normal;
}
@font-face {
font-family: "Roboto Mono";
src: url(/static/fonts/robotomono/RobotoMono-Italic.ttf) format("truetype");
font-weight: 400;
font-style: italic;
}
@font-face {
font-family: "Roboto Mono";
src: url(/static/fonts/robotomono/RobotoMono-Medium.ttf) format("truetype");
font-weight: 500;
font-style: normal;
}
@font-face {
font-family: "Roboto Mono";
src: url(/static/fonts/robotomono/RobotoMono-MediumItalic.ttf) format("truetype");
font-weight: 500;
font-style: italic;
}
@font-face {
font-family: "Roboto Mono";
src: url(/static/fonts/robotomono/RobotoMono-Bold.ttf) format("truetype");
font-weight: 700;
font-style: normal;
}
@font-face {
font-family: "Roboto Mono";
src: url(/static/fonts/robotomono/RobotoMono-BoldItalic.ttf) format("truetype");
font-weight: 700;
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

