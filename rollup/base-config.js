import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import replace from 'rollup-plugin-replace';
import buble from 'rollup-plugin-buble';
import uglify from 'rollup-plugin-uglify';

const DEV = !!JSON.parse(process.env.BUILD_DEV || 'true');
const DEMO = !!JSON.parse(process.env.BUILD_DEMO || 'false');

const plugins = [
  nodeResolve(),

  commonjs(),

  replace({
    values: {
      __DEV__: JSON.stringify(DEV),
      __DEMO__: JSON.stringify(DEMO),
    },
  }),

  buble(),
];

if (!DEV) {
  plugins.push(uglify());
}

export default {
  format: 'iife',
  exports: 'none',
  treeshake: true,
  plugins,
};
