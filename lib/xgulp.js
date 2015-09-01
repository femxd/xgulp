var xgulp = module.exports = {};

Object.defineProperty(global, 'xgulp', {
    enumerable: true,
    writable: false,
    value: xgulp
});

xgulp.emitter = new (require('events').EventEmitter);
['on', 'once', 'removeListener', 'removeAllListeners', 'emit'].forEach(function (key) {
    xgulp[key] = function () {
        var emitter = fis.emitter;
        return emitter[key].apply(emitter, arguments);
    };
});

xgulp.log = require('./log');
xgulp.log.level = xgulp.log.L_ALL;

xgulp.cli = require('./cli');