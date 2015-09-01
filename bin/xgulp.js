#!/usr/bin/env node

var Liftoff = require('liftoff');
var argv = require('minimist')(process.argv.slice(2));
var path = require('path');

var cli = new Liftoff({
    name: 'xgulp',
    processTitle: 'xgulp',
    moduleName: 'xgulp',
    configName: 'xgulp-conf',

    // only js supported!
    extensions: {
        '.js': null
    }
});

cli.launch({}, function (env) {
    var xgulp = require('../');
    xgulp.cli.run(env, argv);
});
