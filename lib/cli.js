var cli = module.exports = {};

var util = require('./util');
var path = require('path');
var read = require('read');
var fs = require('fs');

cli.colors = require('colors');
cli.run = function (env, argv) {
    console.log("env: ", env);

    cli.info = util.readJSON(path.dirname(__dirname) + '/package.json');

    if (!argv._ || !argv._.length) {
        var commander = "\n\r xgulp version: " + cli.info.version;
        commander += "\n\r Usage: xgulp <command> \n\r\n\r";
        commander += "Commands: \n\r\n\r";
        commander += "  init  - init local project \n\r";
        commander += "\n\r\n\r";
        xgulp.log.debug(commander);
        return false;
    }

    if (argv._[0] && argv._[0] === 'init') {
        cli.init(env);
    }
};

cli.init = function (env) {
    xgulp.log.debug("init project", env.cwd);
    read({
        prompt: 'please input your username ? '
    }, function (err, username, isDef) {
        if (!username) {
            xgulp.log.error("username is required");
            return false;
        }

        read({
            prompt: "please input your project name? ",
            default: 'demo'
        }, function (err, result, isDefault) {
            xgulp.log.debug("project name: ", result, ", isDefault: ", isDefault);
            var projectDir = env.cwd + '/' + result;
            fs.mkdirSync(result);
            xgulp.log.debug("mkdir %s [OK]", projectDir);

            var dirs = ['base64', 'css', 'design', 'font', 'html', 'img', 'js', 'mail', 'slice'];

            dirs.forEach(function (dir) {
                fs.mkdirSync(projectDir + '/' + dir);
            });
            xgulp.log.debug('mkdir ', dirs, " [OK]");

            util.copy(path.join(__dirname, "../templates/mail"), projectDir + '/mail');
            xgulp.log.debug("copy mail folder [OK]");

            var gulpfile = fs.readFileSync(path.join(__dirname, '../templates/gulpfile.js'), {encoding: 'utf8'});
            gulpfile = gulpfile.replace(/username\s=\s".+"/, "username = '" + username + "'");
            gulpfile = gulpfile.replace(/projectName\s=\s".+"/, "projectName = '" + result + "'");

            fs.writeFileSync(projectDir + "/gulpfile.js", gulpfile, {encoding: 'utf8'});
            xgulp.log.debug("generate gulpfile.js OK");
        });
    });
};