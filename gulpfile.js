const gulp = require('gulp');
const babel = require('gulp-babel');


function build(cb) {
  return gulp.src('./lib/*.js').pipe(babel({
    presets: ['@babel/env']
  })).pipe(gulp.dest('build'))
  cb()
}


exports.default = gulp.series(build)
