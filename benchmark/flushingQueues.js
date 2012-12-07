var pf = require('performanceFramework');
var qm = require('./queueMonitor.js');
var client = require('./client.js');
var server = require('./server.js');
var childProcess = require('child_process');
var numRequest = 1000;


var scenario4 = pf.describe('Rush benchmark - Flushing Queue', 'This test make ' + numRequest + ' requests to the ' +
    'listener without running the consumer. After that, the consumer is running to process requests and time is ' +
    'measured', 'wijmo', ['Time', 'Queued requests'], [], './log'); //monitor on localhost


var newTest = function(size, callback) {

    scenario4.test('test with ' + size + ' KB of response server', function (log, point) {
        'use strict';

        var count = 0;
        var server1 = server.createServer(0, size * 1024, function () {
            for (var i = 0; i < numRequest; i++) {
                client.client('localhost', 3001, "http://localhost:5001", function () {

                    count++;

                    if (count === numRequest) {

                        var time = new Date().valueOf();
                        point(0, numRequest);

                        var child = childProcess.fork('../src/consumer.js');

                        var monitorInterval = setInterval(function () {

                            qm.monitorQueue('wrL:hpri', function (value) {
                                var timePoint = (new Date().valueOf() - time) / 1000;
                                point(timePoint, value);

                                if (value === 0) {
                                    log(numRequest + ' requests with 100 KB' + ' has been processed in ' + timePoint + ' s');
                                    process.kill(child.pid);
                                    //scenario4.done();
                                    server.closeServer(server1);
                                    clearInterval(monitorInterval);
                                    callback();
                                }
                            });
                        }, 1000);
                    }
                });
            }
        });
    });
}

var nTimes = 0;

function executeTest() {

    if (nTimes >= 5) {
        scenario4.done();
    } else {
        newTest((nTimes + 1) * 100, executeTest);
    }

    nTimes++;
}

executeTest();


