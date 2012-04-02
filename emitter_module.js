//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

var events = require('events');

var eventEmitter = new events.EventEmitter();

function get() {

    return eventEmitter;
}

exports.get = get;

