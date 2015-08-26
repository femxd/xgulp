'use strict';

var username = "allanyu",
    projectName = "allinone5",
    domain = 'http://wapstatic.kf0309.3g.qq.com/';

var enableConfig = {
    px2rem: true, // 是否启用px转成rem
    imgresize: true // 是否开启2x图生成1x图
};

var gulp = require("gulp");
var gulpif = require('gulp-if');
var gutil = require('gulp-util');
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

var copyFromAppDir = [
    'src/**/*.html',
    'src/css/**/*.css',
    'src/js/**/*.*',
    'src/img/**/*.*',
    "!src/base64/*.*"
];

if (!isOptmized)  copyFromAppDir.push('src/slice/**');

// -------------------------------------
// Tasks
// -------------------------------------

gulp.task('clean', function (callback) {
    return plugins.del(['publish/**/*.*'], callback);
});

gulp.task('copy', function () {
    return gulp.src(copyFromAppDir, {base: 'src'}).pipe(gulp.dest("publish/"));
});

gulp.task('style', function () {
    return gulp.src(['src/css/*.less', '!src/css/lib/', '!src/css/mixins/'])
        .pipe(plugins.less())
        .pipe(gulpif(enableConfig.px2rem, plugins.px2rem({replace: true}, {map: true})))
        .pipe(plugins.imageEmbed({
            asset: 'src/base64',
            include: ['base64']
        }))
        .pipe(plugins.autoprefixer('last 2 versions'))
        .pipe(gulpif(isOptmized, plugins.minifyCss({advanced: true, compatibility: 'ie8', keepBreaks: false})))
        .pipe(gulpif(isOptmized, plugins.tmtsprite({
            margin: 0
        })))
        .pipe(gulpif("*.png", gulp.dest('publish/sprite'), gulp.dest('publish/css')));
});

gulp.task('imgmin', ['copy'], function () {
    return gulp.src('src/img')
        .pipe(gulpif(isOptmized, plugins.imagemin({
            // {quality: '80-90', speed: 4}
            use: [pngquant()]
        })))
        .pipe(gulp.dest('publish/img'));
});

gulp.task('spritemin', ['style'], function () {
    return gulp.src('publish/sprite')
        .pipe(gulpif(isOptmized, plugins.imagemin({
            use: [pngquant()]
        })))
        .pipe(gulp.dest('publish/sprite'));
});

gulp.task('upload', ['copy', 'style'], function () {
    return gulp.src("publish/**/*.*")
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
    return gulp.src(['publish/*.html', 'publish/html/*.html'])
        .pipe(plugins.fontSpider({
            backup: false
        }));
});

gulp.task("fontreflow", function () {
    return gulp.src('publish/font/*').pipe(gulp.dest('src'));
});

gulp.task("imgresize", function () {
    return gulp.src("src/**/*@2x.png").pipe(plugins.imgresize({
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
        gulp.watch(copyFromAppDir, isUpload ? ['copy', 'upload'] : ['copy']);
        gulp.watch('src/css/**/*.less', isUpload ? ['style', 'upload'] : ['style']);
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
    gulp.src("publish/**/*.*").pipe(plugins.cdnUpload({
        domain: 'http://3gimg.qq.com/mig-web',
        remoteDir: '/2015/market/allanyu/gulp-demo',  //CDN路径，需要在配置文件里面赔
        uploadUrl: 'http://super.kf0309.3g.qq.com/qm/upload',       //CDN中转地址，CDN的HTTP接口只能是IDC集群中的IP才有权限
        publishDir: 'publish'
    })).pipe(gulp.dest('publish/'));
});
