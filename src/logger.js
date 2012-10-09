//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

//
// Simple substitute for a real logging
//


var INFO = 10, ERROR = 1;

var level = INFO;


function log(loglevel, msg, obj) {
    "use strict";
    if (level >= loglevel) {
        console.log(msg);
        if (obj)   {
            console.dir(obj);
        }
    }
}

function info(msg, obj) {
    "use strict";
    log(INFO, msg, obj);
}

function error(msg, obj) {
    "use strict";
    log(ERROR, msg, obj);
}

exports.info = info;
exports.error = error;
