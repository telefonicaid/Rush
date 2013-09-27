var memwatch = require("memwatch"),
    probe = require("./monitoringProbe"),
    configGlobal = require('./configBase.js'),
    fs = require("fs"),
    log = require('./logger'),
    path = require('path');

logger = log.newLogger();
logger.prefix = path.basename(module.filename, '.js');

memwatch.on('leak', function(info) {
    logger.error('Memory leak!!', { op: 'MEMORY_LEAK', error: info });
    probe.setLastLeak(info);
});

memwatch.on('stats', function(stats) {
    probe.setMemoryData(stats);
});

var heapDiff;

function takeHeapDiff() {
    if (heapDiff) {
        var diff = heapDiff.end();

        fs.writeFileSync("heapDiff" + (new Date()).toISOString() + ".json", JSON.stringify(diff, null, 4));
    }

    heapDiff = new memwatch.HeapDiff();
}

if (configGlobal.activateHeapDiff) {
    setInterval(takeHeapDiff, configGlobal.periodHeapDiff);
}