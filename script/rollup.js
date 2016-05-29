var rollup = require('rollup').rollup;
var babel = require('rollup-plugin-babel');
var uglify = require('rollup-plugin-uglify');
var commonjs = require('rollup-plugin-commonjs');
var nodeResolve = require('rollup-plugin-node-resolve');

rollup({
  entry: 'src/home-assistant.js',
  plugins: [
    nodeResolve({
      jsnext: true,
      main: true,
    }),

    commonjs({
      include: 'node_modules/**',
    }),

    babel({
      exclude: 'node_modules/**',
    }),
    uglify(),
  ],
}).then(function (bundle) {
  return bundle.write({
    format: 'es6',
    // format: 'iife',
    dest: 'build/ui_rollup.js',
  });
});
