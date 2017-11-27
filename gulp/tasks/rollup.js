const gulp = require('gulp');
const rollupEach = require('gulp-rollup-each');
const commonjs = require('rollup-plugin-commonjs');
const nodeResolve = require('rollup-plugin-node-resolve');
const replace = require('rollup-plugin-replace');
const babel = require('rollup-plugin-babel');
const uglify = require('../common/gulp-uglify.js');

const DEV = !!JSON.parse(process.env.BUILD_DEV || 'true');
const DEMO = !!JSON.parse(process.env.BUILD_DEMO || 'false');

function getRollupInputOptions(es6) {
  const babelOpts = {
    babelrc: false,
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
  };

  if (!es6) {
    babelOpts.presets = [
      [
        'es2015',
        {
          modules: false
        }
      ]
    ];
  }

  return {
    plugins: [
      babel(babelOpts),

      nodeResolve({
        jsnext: true,
        main: true,
      }),

      commonjs(),

      replace({
        values: {
          __DEV__: JSON.stringify(DEV),
          __DEMO__: JSON.stringify(DEMO),
          __BUILD__: JSON.stringify(es6 ? 'latest' : 'es5'),
        },
      }),
    ],
  };
}

const rollupOutputOptions = {
  format: 'iife',
  exports: 'none',
};

gulp.task('run_rollup_es5', () => gulp.src([
  'js/core.js',
  'js/compatibility.js',
  'demo_data/demo_data.js',
])
  .pipe(rollupEach(getRollupInputOptions(/* es6= */ false), rollupOutputOptions))
  .on('error', err => console.error(err.message))
  .pipe(gulp.dest('build-temp-es5')));

gulp.task('run_rollup', () => gulp.src([
  'js/core.js',
  'js/panel-config/panel-config.js',
  'js/util.js',
  'demo_data/demo_data.js',
])
  .pipe(rollupEach(getRollupInputOptions(/* es6= */ true), rollupOutputOptions))
  .on('error', err => console.error(err.message))
  .pipe(gulp.dest('build-temp')));

gulp.task('ru_all_es5', ['run_rollup_es5'], () => {
  gulp.src([
    'build-temp-es5/core.js',
    'build-temp-es5/compatibility.js',
  ])
    .pipe(uglify(/* es6= */ false, { sourceMap: false }))
    .pipe(gulp.dest('build-es5/'));
});

gulp.task('ru_all', ['run_rollup'], () => {
  gulp.src([
    'build-temp/core.js',
  ])
    .pipe(uglify(/* es6= */ true, { sourceMap: false }))
    .pipe(gulp.dest('build/'));
});

gulp.task('watch_ru_all', ['ru_all'], () => {
  gulp.watch([
    'js/**/*.js',
    'demo_data/**/*.js'
  ], ['ru_all']);
});

gulp.task('watch_ru_all_es5', ['ru_all_es5'], () => {
  gulp.watch([
    'js/**/*.js',
    'demo_data/**/*.js'
  ], ['ru_all_es5']);
});
