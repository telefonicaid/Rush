//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

var events = require('events');

var eventEmitter = new events.EventEmitter();

function get() {
    "use strict";
    return eventEmitter;
}

exports.get = get;

