'use strict';

var username = "allanyu",
    projectName = "test1",
    domain = 'http://wapstatic.kf0309.3g.qq.com/';

var enableConfig = {
    px2rem: false // 启用px转换为rem
};

var gulp = require("gulp");
var gulpif = require('gulp-if');
var gutil = require('gulp-util');
var path = require('path');
var map = require('vinyl-map');
var pngquant = require('imagemin-pngquant');
var argv = require("yargs").argv;
var runSeq = require('run-sequence').use(gulp);

// plugins
var del = require('del');
var less = require("gulp-less");
var px2rem = require('gulp-px2rem');
var imageEmbed = require('gulp-image-embed');
var autoprefixer = require('gulp-autoprefixer');
var minifyCss = require('gulp-minify-css');
var tmtsprite = require('gulp-tmtsprite');
//var imagemin = require('gulp-imagemin');
var fileUpload = require('gulp-file-upload');
var fontSpider = require('gulp-font-spider');
var imgresize = require('gulp-2x');
var cdnUpload = require('gulp-cdn-upload');
var htmlList = require('gulp-html-list');
var hbsHtml = require('gulp-hbs-html');
var sendMail = require('gulp-send-mail');

if (!username || !projectName) {
    gutil.log(gutil.colors.red("You must setting username and projectName!"));
    process.exit(-1);
}

var isOptmized = argv.o !== undefined || argv.optimized !== undefined,
    isUpload = argv.u !== undefined || argv.upload !== undefined,
    isWatch = argv.w !== undefined || argv.watch !== undefined,
    useFont = argv.f !== undefined || argv.font !== undefined;

var xgulp = {
    htmlFiles: ['*.html', 'html/*.html'],
    publishHtmls: ['publish/*.html', 'publish/html/*.html'],

    cssFiles: ['css/**/*.css'],
    styleFiles: ['css/**/*.css', 'css/*.less', '!css/lib/', '!css/mixins/'],
    cssDest: 'publish/css',

    jsFiles: ['js/**/*.js'],
    jsDest: 'publish/js',

    imgFiles: 'img/**',
    imgDest: 'publish/img',
    img2xDir: "**/*@2x.png",
    sliceDir: 'slice/**',
    spriteDest: 'publish/sprite',
    imgMinFiles: ['publish/img/**/*.png', 'publish/sprite/*.png'],

    publishDir: 'publish/',
    publishFiles: ['publish/**/*.*', '!publish/design/*.psd'],

    fontDir: 'font/',
    publishFonts: 'publish/font/',

    mailFiles: 'mail/**',
    mailDir: 'mail/',

    designFiles: 'design/**'
};

xgulp.copyFromAppDir = (function () {
    var copyFiles = [];

    function appendItems(arr, toconcat) {
        if (typeof toconcat === 'string')
            toconcat = [toconcat];
        Array.prototype.splice.apply(arr, [arr.length - 1, 0].concat(toconcat));
    }

    appendItems(copyFiles, xgulp.htmlFiles);
    appendItems(copyFiles, xgulp.cssFiles);
    appendItems(copyFiles, xgulp.jsFiles);
    appendItems(copyFiles, xgulp.imgFiles);
    if (!isOptmized)
        appendItems(copyFiles, xgulp.sliceDir);
    appendItems(copyFiles, xgulp.fontDir);
    appendItems(copyFiles, xgulp.designFiles);

    //console.log("copyFiles: ", copyFiles);
    return copyFiles;
})();

// -------------------------------------
// Tasks
// -------------------------------------

gulp.task('clean', function (callback) {
    return del(xgulp.publishDir, callback);
});

gulp.task('copy', function () {
    return gulp.src(xgulp.copyFromAppDir, {base: '.'}).pipe(gulp.dest(xgulp.publishDir));
});

gulp.task('style', function () {
    return gulp.src(xgulp.styleFiles)
        .pipe(gulpif(function (file) {
            //console.log("path: ", file.path, ", is? ", path.extname(file.path) === '.less');
            return path.extname(file.path) === '.less'
        }, less()))
        .pipe(gulpif(enableConfig.px2rem, px2rem({replace: true}, {map: true})))
        .pipe(imageEmbed({
            asset: 'base64/',
            include: ['base64']
        }))
        .pipe(autoprefixer('last 2 versions'))
        .pipe(gulpif(isOptmized, minifyCss({advanced: true, compatibility: 'ie8', keepBreaks: false})))
        .pipe(gulpif(isOptmized, tmtsprite({
            margin: 0
        })))
        .pipe(gulpif("*.png", gulp.dest(xgulp.spriteDest), gulp.dest(xgulp.cssDest)));
});

gulp.task('imgmin', ['copy', 'style'], function () {
    //return gulp.src('img/**')
    //    .pipe(gulpif(isOptmized, imagemin({
    //        // {quality: '80-90', speed: 4}
    //        use: [pngquant()]
    //    })))
    //    .pipe(gulp.dest("publish/img"));
});

gulp.task('spritemin', ['copy', 'style'], function () {
    //return gulp.src("publish/sprite/**")
    //    .pipe(gulpif(isOptmized, imagemin({
    //        // {quality: '80-90', speed: 4}
    //        use: [pngquant()]
    //    })))
    //    .pipe(gulp.dest('publish/sprite'));
});

gulp.task('upload', ['copy', 'style'], function () {
    return gulp.src(xgulp.publishFiles)
        .pipe(fileUpload({
            url: 'http://ued.wsd.com/receiver/receiver.php',
            method: 'POST',
            to: '/data/wapstatic/' + username + '/',
            proj_name: projectName,
            destDir: 'publish',
            domain: domain
        }));
});

gulp.task('fontspider', function () {
    return gulp.src(xgulp.publishHtmls).pipe(fontSpider({
        backup: false
    }));
});

gulp.task("fontreflow", function () {
    return gulp.src(xgulp.publishFonts).pipe(xgulp.fontDir);
});

/**
 * 从2x图生成1x图
 */
gulp.task("imgresize", function () {
    return gulp.src(xgulp.img2xDir).pipe(imgresize({
        ratio: 0.5
    }));
});

// 图片压缩现在有问题
//isOptmized && buildDepts.splice.apply(buildDepts, [0, 0].concat(['spritemin']));

gulp.task('watch', function () {
    gulp.watch(xgulp.copyFromAppDir, isUpload ? ['copy', 'upload'] : ['copy']);
    gulp.watch(xgulp.styleFiles, isUpload ? ['style', 'upload'] : ['style']);
    if (isUpload)
        gutil.log("please open: " + (domain + "/" + username + "/" + projectName + "/<your html>"));
});

gulp.task('build', function (callback) {
    var seqs = ['clean'];
    var secSeqs = ['copy', 'style'];
    if (useFont) {
        secSeqs.push('fontspider');
    }
    seqs.push(secSeqs);
    if (isUpload)
        seqs.push('upload');
    if (isWatch)
        seqs.push('watch');
    seqs.push(callback);
    runSeq.apply(null, seqs);
});

gulp.task("cdn", ['build'], function () {
    return gulp.src(xgulp.publishFiles).pipe(cdnUpload({
        domain: 'http://3gimg.qq.com/mig-web',
        remoteDir: '/2015/market/allanyu/gulp-demo',
        uploadUrl: 'http://super.kf0309.3g.qq.com/qm/upload',
        publishDir: 'publish'
    })).pipe(gulp.dest(xgulp.publishDir));
});

gulp.task('htmllist', ['build'], function () {
    return gulp.src(xgulp.publishHtmls).pipe(htmlList({
        domain: domain,
        username: username,
        projectName: projectName
    }));
});

gulp.task('mail', ['htmllist'], function () {
    gulp.src(xgulp.mailFiles).pipe(gulpif(true, hbsHtml())).pipe(sendMail({
        url: 'http://super.kf0309.3g.qq.com/tofapi/sendmail',
        apiKey: 'mxdfemk520'
    })).pipe(gulp.dest(xgulp.mailDir));
});

gulp.task("default", function () {
    var red = gutil.colors.red;
    var commander = "\n\r";
    commander += "Usage: gulp <command> \n\r\n\r";
    commander += "Commands: \n\r\n\r";
    commander += "  build       构建本地项目, 上传文件到测试环境  \n\r";
    commander += "  cdn         上传文件到CDN\n\r";
    commander += "  mail        发送重构待确认邮件\n\r";
    commander += "  imgresize   从2x图生成1x图片\n\r";
    commander += "\n\r\n\r";

    commander += "Options: \n\r\n\r";
    commander += "  -o, --optimized   optimizing and minized js, css, image.  and image sprite \n\r";
    commander += "  -u, --upload      upload your project to test env \n\r";
    commander += "  -w, --watch       watching your project and build increment \n\r";
    commander += "  -f, --font        with font spider. just use when you used web font \n\r";
    commander += "\n\r\n\r";

    gutil.log(red(commander));
});
