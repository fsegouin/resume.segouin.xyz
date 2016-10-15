import fs from 'fs';
import path from 'path';

import gulp from 'gulp';
import connect from 'gulp-connect';

// Load all gulp plugins automatically
// and attach them to the `plugins` object
import plugins from 'gulp-load-plugins';

// Temporary solution until gulp 4
// https://github.com/gulpjs/gulp/issues/355
import runSequence from 'run-sequence';

import archiver from 'archiver';
import glob from 'glob';
import del from 'del';

import pkg from './package.json';

const dirs = pkg['h5bp-configs'].directories;

// ---------------------------------------------------------------------
// | Helper tasks                                                      |
// ---------------------------------------------------------------------

gulp.task('archive:create_archive_dir', () => {
    fs.mkdirSync(path.resolve(dirs.archive), '0755');
});

gulp.task('archive:zip', (done) => {

    const archiveName = path.resolve(dirs.archive, `${pkg.name}_v${pkg.version}.zip`);
    const zip = archiver('zip');
    const files = glob.sync('**/*.*', {
        'cwd': dirs.dist,
        'dot': true // include hidden files
    });
    const output = fs.createWriteStream(archiveName);

    zip.on('error', (error) => {
        done();
        throw error;
    });

    output.on('close', done);

    files.forEach( (file) => {

        const filePath = path.resolve(dirs.dist, file);

        // `zip.bulk` does not maintain the file
        // permissions, so we need to add files individually
        zip.append(fs.createReadStream(filePath), {
            'name': file,
            'mode': fs.statSync(filePath).mode
        });

    });

    zip.pipe(output);
    zip.finalize();

});

gulp.task('clean', (done) => {
    del([
        dirs.archive,
        dirs.dist
    ]).then( () => {
        done();
    });
});

gulp.task('copy', [
    'copy:index.html',
    'copy:main.css',
    'copy:misc',
    'copy:normalize'
]);

gulp.task('copy:index.html', () =>
    gulp.src(`${dirs.src}/index.html`)
        .pipe(gulp.dest(dirs.dist))
);

gulp.task('copy:main.css', () => {
    var postcss    = require('gulp-postcss');
    var sourcemaps = require('gulp-sourcemaps');

    gulp.src(`${dirs.src}/css/main.css`)
        .pipe(sourcemaps.init())
        .pipe(postcss([ require('autoprefixer'), require('precss') ]))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(`${dirs.dist}/css`));
});

gulp.task('copy:misc', () =>
    gulp.src([

        // Copy all files
        `${dirs.src}/**/*`,

        // Exclude the following files
        // (other tasks will handle the copying of these files)
        `!${dirs.src}/css/main.css`,
        `!${dirs.src}/index.html`

    ], {

        // Include hidden files by default
        dot: true

    }).pipe(gulp.dest(dirs.dist))
);

gulp.task('copy:normalize', () =>
    gulp.src('node_modules/normalize.css/normalize.css')
        .pipe(gulp.dest(`${dirs.dist}/css`))
);

gulp.task('lint:js', () =>
    gulp.src([
        'gulpfile.js',
        `${dirs.src}/js/*.js`,
        `${dirs.test}/*.js`
    ]).pipe(plugins().jscs())
      .pipe(plugins().jshint())
      .pipe(plugins().jshint.reporter('jshint-stylish'))
      .pipe(plugins().jshint.reporter('fail'))
);

gulp.task('css', () => {
    var postcss    = require('gulp-postcss');
    var sourcemaps = require('gulp-sourcemaps');

    gulp.src(`${dirs.src}/css/main.css`)
        .pipe(sourcemaps.init())
        .pipe(postcss([ require('autoprefixer'), require('precss') ]))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(`${dirs.dist}/css`))
        .pipe(connect.reload());
});

// ---------------------------------------------------------------------
// | Main tasks                                                        |
// ---------------------------------------------------------------------

gulp.task('archive', (done) => {
    runSequence(
        'build',
        'archive:create_archive_dir',
        'archive:zip',
    done)
});

gulp.task('build', (done) => {
    runSequence(
        ['clean', 'lint:js'],
        'copy',
    done)
});

gulp.task('webserver', () => {
  connect.server({
    root: 'src',
    livereload: true
  });
});

gulp.task('watch', () => {
    gulp.watch('src/css/*.css', ['css']);
});

gulp.task('default', ['css', 'webserver', 'watch']);
