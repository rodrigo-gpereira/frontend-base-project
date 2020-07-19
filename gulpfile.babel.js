import { src, dest, watch, series, parallel } from "gulp";
import yargs from "yargs";
import sass from "gulp-sass";
import cleanCss from "gulp-clean-css";
import gulpif from "gulp-if";
import postcss from "gulp-postcss";
import sourcemaps from "gulp-sourcemaps";
import autoprefixer from "autoprefixer";
import imagemin from "gulp-imagemin";
import del from "del";
import webpack from "webpack-stream";
import browserSync from "browser-sync";
import zip from "gulp-zip";
import info from "./package.json";
import webp from "gulp-webp";

require("dotenv").config();

//import replace from "gulp-replace";

const PRODUCTION = yargs.argv.prod;

//STYLES
export const styles = () => {
  return src("src/scss/style.scss")
    .pipe(gulpif(!PRODUCTION, sourcemaps.init()))
    .pipe(sass().on("error", sass.logError))
    .pipe(gulpif(PRODUCTION, postcss([autoprefixer])))
    .pipe(gulpif(PRODUCTION, cleanCss({ compatibility: "ie8" })))
    .pipe(gulpif(!PRODUCTION, sourcemaps.write()))
    .pipe(dest("./dist/css"));
};

//Image
export const images = () => {
  return src("src/images/**/*.{jpg,jpeg,png,svg,gif}")
    .pipe(gulpif(PRODUCTION, imagemin()))
    .pipe(webp())
    .pipe(dest("dist/images"));
};

//Watch
export const watching = () => {
  watch("src/scss/**/*.scss", series(styles, reload));
  watch("src/images/**/*.{jpg,jpeg,png,svg,gif,webp}", series(images, reload));
  watch(
    ["src/**/*", "!src/{images,js,scss}", "!src/{images,js,scss}/**/*"],
    series(copy, reload)
  );
  watch("src/js/**/*.js", series(scripts, reload));
  watch("**/*.html", reload);
};

//Copy
export const copy = () => {
  return src([
    "src/**/*",
    "!src/{images,js,scss}",
    "!src/{images,js,scss}/**/*",
  ]).pipe(dest("dist"));
};

// Del
export const clean = () => del(["dist"]);

// Scripts
export const scripts = () => {
  return src("src/js/main.js")
    .pipe(
      webpack({
        module: {
          rules: [
            {
              test: /\.js$/,
              use: {
                loader: "babel-loader",
                options: {
                  presets: [],
                },
              },
            },
          ],
        },
        mode: PRODUCTION ? "production" : "development",
        devtool: !PRODUCTION ? "inline-source-map" : false,
        output: {
          filename: "main.js",
        },
      })
    )
    .pipe(dest("dist/js"));
};

//Browser Sync
const server = browserSync.create();
export const serve = (done) => {
  server.init();
  done();
};
export const reload = (done) => {
  server.reload();
  done();
};

//ZIP
export const compress = () => {
  return src([
    "**/*",
    "!node_modules{,/**}",
    "!src{,/**}",
    "!.babelrc",
    "!.gitignore",
    "!gulpfile.babel.js",
    "!package.json",
    "!package-lock.json",
  ])
    .pipe(zip(`${info.name}.zip`))
    .pipe(dest("../"));
};

// Build e Dev Run
export const dev = series(
  clean,
  parallel(styles, images, copy, scripts),
  serve,
  watching
);
export const build = series(
  clean,
  parallel(styles, images, copy, scripts),
  compress
);
export default dev;
