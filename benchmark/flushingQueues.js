var pf = require('performanceFramework');
var redisUtils = require('./redisUtils.js');
var client = require('./client.js');
var server = require('./server.js');
var childProcess = require('child_process');
var numRequest = 10000;
var numConsumer = 2;

var scenario = pf.describe(
    'Rush benchmark - Flushing Queue',  //Benchmak name
    'This test make ' + numRequest + ' requests to the listener without running any consumer. After that, '
        + numConsumer + '  consumer(s) are run to process requests and time is measured', //Description
    'wijmo',                            //Template
    ['Time', 'Queued requests'],        //X: Time, Y: Pending Queues to process
    [],                                 //No processes can be monitored because of performanceFramework behaviour
    './log');                           //The generated HTML file will be save in the 'log' folder.


var newTest = function (size, callback) {
    'use strict';

    //First of all, we must flush redis
    redisUtils.flushBBDD(function() {

        scenario.test('Payload of ' + size + ' KB', function (log, point) {

            var count = 0;
            var server1 = server.createServer(0, size * 1024, function () {
                for (var i = 0; i < numRequest; i++) {

                    client.client('localhost', 3001, "http://localhost:5001", function () {

                        count++;

                        //Launch the consumers to process the petitions
                        if (count === numRequest) {

                            var done = false;
                            var initialTime = new Date().valueOf();
                            point(0, numRequest);

                            //Launch consumers
                            var childs = [];
                            for (var i = 0; i < numConsumer; i++) {
                                childs.push(childProcess.fork('../src/consumer.js'));
                            }

                            var monitorInterval = setInterval(function () {

                                redisUtils.monitorQueue('wrL:hpri', function (remainingPetitions) {
                                    var timePoint = (new Date().valueOf() - initialTime) / 1000;
                                    point(timePoint, remainingPetitions);
                                    log(remainingPetitions + ' pending requests ' + timePoint + ' seconds later');

                                    if (remainingPetitions === 0 && !done) {

                                        done = true;
                                        clearInterval(monitorInterval);

                                        log(numRequest + ' requests of ' + size + ' KB have been processed in ' +
                                            timePoint + ' s (' + (numRequest/timePoint) + ' requests/s)');

                                        for (var i = 0; i < childs.length; i++) {
                                            process.kill(childs[i].pid);
                                        }

                                        server.closeServer(server1);

                                        callback();
                                    }
                                });
                            }, 1000);
                        }
                    });
                }
            });
        });
    });
}

var nTimes = 0;

function executeTest() {

    if (nTimes >= 5) {
        scenario.done();
        redisUtils.closeConnection();
    } else {
        //newTest((nTimes + 1) * 100, executeTest);
        newTest((nTimes + 1) * 4, executeTest);
    }

    nTimes++;
}

executeTest();