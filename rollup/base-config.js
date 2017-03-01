import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import replace from 'rollup-plugin-replace';
import buble from 'rollup-plugin-buble';
import uglify from 'rollup-plugin-uglify';

const DEV = !!JSON.parse(process.env.BUILD_DEV || 'true');
const DEMO = !!JSON.parse(process.env.BUILD_DEMO || 'false');
const NODE_ENV = DEV ? 'development' : 'production'

const plugins = [
  nodeResolve({}),

  commonjs(),

  replace({
    values: {
      ___DEV___: JSON.stringify(DEV),
      ___DEMO___: JSON.stringify(DEMO),
      'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
    },
  }),
];

if (!DEV) {
  plugins.push(buble());
  plugins.push(uglify());
}

export default {
  format: 'iife',
  exports: 'none',
  treeshake: true,
  plugins,
};
