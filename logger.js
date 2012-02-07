/**
 * Created by JetBrains WebStorm.
 * User: brox
 * Date: 7/02/12
 * Time: 13:25
 * To change this template use File | Settings | File Templates.
 */

//
// Simple substitute for a real logging
//


var INFO = 10, ERROR = 1;

var level = INFO;


function log(loglevel, msg, obj) {
    if (level >= loglevel) {
        console.log(msg);
        if (obj)
            console.dir(obj);
    }
}

function info(msg, obj) {
    log(INFO, msg, obj);
}

function error(msg, obj) {
    log(ERROR, msg, obj);
}

exports.info = info;
exports.error = error;
