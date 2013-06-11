/**
 * Redis information
 * @type {Object}
 */
exports.redisServer = {host:'localhost', port:6379};

///////////////////
//BLOCKING SERVER//
///////////////////

exports.blockingServer = {};

exports.blockingServer.numPetitions = 400;
exports.blockingServer.time = 30000;

exports.blockingServer.startDelay = 1000;
exports.blockingServer.maxDelay = 5000;
exports.blockingServer.delayInterval = 1000;


/**
 * Performace Framework configuration
 * @type {Object}
 */
exports.blockingServer.pf = {};
exports.blockingServer.pf.name = 'Rush benchmark - Blocking server';
exports.blockingServer.pf.description = 'This test makes 500 requests. One every 10ms. This shows how Rush behaves ' +
    'against blocking servers';
exports.blockingServer.pf.template = 'wijmo';
exports.blockingServer.pf.axis = ['Time', 'Queued requests'];
exports.blockingServer.pf.monitors = ['localhost'];
exports.blockingServer.pf.folder = './log';


///////////////////
//FLUSHING QUEUES//
///////////////////

exports.flushingQueues = {};

exports.flushingQueues.numServices = 5000;
exports.flushingQueues.numConsumers = 1;

exports.flushingQueues.startNumBytes = 1024;
exports.flushingQueues.maxNumBytes = 4096;
exports.flushingQueues.bytesInterval = 1024;

/**
 * Performace Framework configuration
 * @type {Object}
 */
exports.flushingQueues.pf = {};
exports.flushingQueues.pf.name = 'Rush benchmark - Flushing Queue';
exports.flushingQueues.pf.description = 'This test make ' + this.flushingQueues.numServices + ' requests to the ' +
    'listener without running any consumer. After that, ' + this.flushingQueues.numConsumers + '  consumer(s) are ' +
    'run to process requests and time is measured';
exports.flushingQueues.pf.template = 'wijmo';
exports.flushingQueues.pf.axis = ['Time (s)', 'Services Completed'];
exports.flushingQueues.pf.monitors = [];
exports.flushingQueues.pf.folder = './log';

/////////////////
//NO LAG SERVER//
/////////////////

exports.noLagServer = {};

exports.noLagServer.size = 10 * 1024 * 1024;
exports.noLagServer.time = 120000;
exports.noLagServer.numPetitions = 300;

/**
 * Performace Framework configuration
 * @type {Object}
 */
exports.noLagServer.pf = {};
exports.noLagServer.pf.name = 'Rush benchmark - Server without lags';
exports.noLagServer.pf.description = 'In this scenario we will test Rush behaviour with a server wit no lag';
exports.noLagServer.pf.template = 'wijmo';
exports.noLagServer.pf.axis = ['Time', 'Queued requests'];
exports.noLagServer.pf.monitors = ['localhost'];
exports.noLagServer.pf.folder = './log';


