const commonjs = require('rollup-plugin-commonjs');
const nodeResolve = require('rollup-plugin-node-resolve');
const replace = require('rollup-plugin-replace');
const babel = require('rollup-plugin-babel');
const uglify = require('rollup-plugin-uglify');
const { minify } = require('uglify-es');

const DEV = !!JSON.parse(process.env.BUILD_DEV || 'true');
const DEMO = !!JSON.parse(process.env.BUILD_DEMO || 'false');

const plugins = [
  babel({
    babelrc: false,
    presets: [
      [
        'es2016',
      ]
    ],
    plugins: [
      'external-helpers',
      'transform-object-rest-spread',
      [
        'transform-react-jsx',
        {
          pragma: 'h'
        }
      ],
    ]
  }),

  nodeResolve({
    jsnext: true,
    main: true,
  }),

  commonjs(),

  replace({
    values: {
      __DEV__: JSON.stringify(DEV),
      __DEMO__: JSON.stringify(DEMO),
    },
  }),
];

if (!DEV) {
  plugins.push(uglify({}, minify));
}

module.exports = {
  format: 'iife',
  exports: 'none',
  treeshake: true,
  plugins,
};
