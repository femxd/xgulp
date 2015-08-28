'use strict';

var username = "allanyu",
    projectName = "allinone5",
    domain = 'http://wapstatic.kf0309.3g.qq.com/';

var enableConfig = {
    px2rem: true, // �Ƿ�����pxת��rem
    imgresize: true // �Ƿ���2xͼ����1xͼ
};

var gulp = require("gulp");
var gulpif = require('gulp-if');
var gutil = require('gulp-util');
var path = require('path');
var plugins = require('gulp-load-plugins')({
    pattern: ['gulp-*', 'gulp.*', 'del'],
    scope: ['dependencies', 'devDependencies'],
    replaceString: /^gulp(?:\-|\.)/,
    camelize: true,
    rename: {'gulp-2x': 'imgresize'}
});
var map = require('vinyl-map');
var pngquant = require('imagemin-pngquant');
var argv = require("yargs").argv;

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

    imgFiles: 'img/**/*.*',
    imgDest: 'publish/img',
    img2xDir: "**/*@2x.png",
    sliceDir: 'slice/**',
    spriteDest: 'publish/sprite',

    publishDir: 'publish/',
    publishFiles: 'publish/**/*.*',

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

    console.log("copyFiles: ", copyFiles);
    return copyFiles;
})();

// -------------------------------------
// Tasks
// -------------------------------------

gulp.task('clean', function (callback) {
    return plugins.del(xgulp.publishDir, callback);
});

gulp.task('copy', function () {
    return gulp.src(xgulp.copyFromAppDir, {base: '.'}).pipe(gulp.dest(xgulp.publishDir));
});

gulp.task('style', function () {
    return gulp.src(xgulp.styleFiles)
        .pipe(gulpif(function (file) {
            //console.log("path: ", file.path, ", is? ", path.extname(file.path) === '.less');
            return path.extname(file.path) === '.less'
        }, plugins.less()))
        .pipe(gulpif(enableConfig.px2rem, plugins.px2rem({replace: true}, {map: true})))
        .pipe(plugins.imageEmbed({
            asset: 'base64/',
            include: ['base64']
        }))
        .pipe(plugins.autoprefixer('last 2 versions'))
        .pipe(gulpif(isOptmized, plugins.minifyCss({advanced: true, compatibility: 'ie8', keepBreaks: false})))
        .pipe(gulpif(isOptmized, plugins.tmtsprite({
            margin: 0
        })))
        .pipe(gulpif("*.png", gulp.dest(xgulp.spriteDest), gulp.dest(xgulp.cssDest)));
});

gulp.task('imgmin', ['copy'], function () {
    return gulp.src(xgulp.imgFiles)
        .pipe(gulpif(isOptmized, plugins.imagemin({
            // {quality: '80-90', speed: 4}
            use: [pngquant()]
        })))
        .pipe(gulp.dest(xgulp.imgDest));
});

gulp.task('spritemin', ['style'], function () {
    return gulp.src(xgulp.spriteDest)
        .pipe(gulpif(isOptmized, plugins.imagemin({
            use: [pngquant()]
        })))
        .pipe(gulp.dest(xgulp.spriteDest));
});

gulp.task('upload', ['copy', 'style'], function () {
    return gulp.src(xgulp.publishFiles)
        .pipe(plugins.fileUpload({
            url: 'http://ued.wsd.com/receiver/receiver.php',
            method: 'POST',
            to: '/data/wapstatic/' + username + '/',
            proj_name: projectName,
            destDir: 'publish',
            domain: domain
        }));
});

gulp.task('fontspider', function () {
    return gulp.src(xgulp.publishHtmls).pipe(plugins.fontSpider({
        backup: false
    }));
});

gulp.task("fontreflow", function () {
    return gulp.src(xgulp.publishFonts).pipe(xgulp.fontDir);
});

gulp.task("imgresize", function () {
    return gulp.src(xgulp.img2xDir).pipe(plugins.imgresize({
        ratio: 0.5
    }));
});

var buildDepts = ['copy', 'style'];
enableConfig.imgresize && buildDepts.push('imgresize');
isOptmized && buildDepts.splice.apply(buildDepts, [0, 0].concat(['imgmin', 'spritemin']));
useFont && buildDepts.push("fontspider");
isUpload && buildDepts.push('upload');

gulp.task('build', buildDepts, function () {
    if (isWatch) {
        gulp.watch(xgulp.copyFromAppDir, isUpload ? ['copy', 'upload'] : ['copy']);
        gulp.watch(xgulp.styleFiles, isUpload ? ['style', 'upload'] : ['style']);
        if (isUpload)
            gutil.log("please open: " + (domain + "/" + username + "/" + projectName + "/<your html>"));
    }
});

gulp.task("default", function () {
    var red = gutil.colors.red;
    var commander = "\n\r";
    commander += "Usage: gulp <command> \n\r\n\r";
    commander += "Commands: \n\r\n\r";
    commander += "  build   just build your project \n\r";
    commander += "  release  just release your project to CDN and send mail \n\r";
    commander += "\n\r\n\r";

    commander += "Options: \n\r\n\r";
    commander += "  -o, --optimized   optimizing and minized js, css, image.  and image sprite \n\r";
    commander += "  -u, --upload      upload your project to test env \n\r";
    commander += "  -w, --watch       watching your project and build increment \n\r";
    commander += "  -f, --font        with font spider. just use when you used web font \n\r";
    commander += "\n\r\n\r";

    gutil.log(red(commander));
});


gulp.task("cdn", ['build'], function () {
    return gulp.src(xgulp.publishFiles).pipe(plugins.cdnUpload({
        domain: 'http://3gimg.qq.com/mig-web',
        remoteDir: '/2015/market/allanyu/gulp-demo',  //CDN·������Ҫ�������ļ�������
        uploadUrl: 'http://super.kf0309.3g.qq.com/qm/upload',       //CDN��ת��ַ��CDN��HTTP�ӿ�ֻ����IDC��Ⱥ�е�IP����Ȩ��
        publishDir: 'publish'
    })).pipe(gulp.dest(xgulp.publishDir));
});

gulp.task('htmllist', ['build'], function () {
    return gulp.src(xgulp.publishHtmls).pipe(plugins.htmlList({
        domain: domain,
        username: username,
        projectName: projectName
    }));
});

gulp.task('mail', function () {
    gulp.src(xgulp.mailFiles).pipe(gulpif(true, plugins.hbsHtml())).pipe(plugins.sendMail({
        url: 'http://super.kf0309.3g.qq.com/tofapi/sendmail',
        apiKey: 'mxdfemk520'
    })).pipe(gulp.dest(xgulp.mailDir));
});
