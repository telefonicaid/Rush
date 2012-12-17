var pf = require('performanceFramework');
var redisUtils = require('./redisUtils.js');
var client = require('./client.js');
var serverFactory = require('./server.js');
var childProcess = require('child_process');
var numServices = 5000;
var numConsumers = 1;
var timeOut = 0;
var port = 5001;

var scenario = pf.describe(
    'Rush benchmark - Flushing Queue',  //Benchmak name
    'This test make ' + numServices + ' requests to the listener without running any consumer. After that, '
        + numConsumers + '  consumer(s) are run to process requests and time is measured', //Description
    'wijmo',                            //Template
    ['Time (s)', 'Services Completed'], //X: Time, Y: Pending Queues to process
    [],                                 //No processes can be monitored because of performanceFramework behaviour
    './log');                           //The generated HTML file will be save in the 'log' folder.


var newTest = function (size, callback) {
    'use strict';

    //First of all, we must flush redis
    redisUtils.flushBBDD(function() {

        scenario.test('Payload of ' + size + ' KB', function (log, point) {

            var children = [];
            var servicesQueued = 0;
            var servicesCompleted = 0;
            var initialTime;

            var processPetitions = function() {

                servicesQueued++;

                if (servicesQueued === numServices) {
                    var server = serverFactory.createServer(timeOut, size * 1024,

                        //Launch consumers when the server is up
                        function () {

                            initialTime = new Date().valueOf();

                            //Launch consumers
                            for (var i = 0; i < numConsumers; i++) {
                                children.push(childProcess.fork('../src/consumer.js'));
                            }
                        },

                        //Control the number of processed services
                        function() {

                            servicesCompleted++;
                            var timePoint = (new Date().valueOf() - initialTime) / 1000;

                            if ((servicesCompleted % 100) === 0) {
                                point(timePoint, servicesCompleted);
                                log(servicesCompleted + ' services completed ' + timePoint + ' seconds later');
                            }

                            if (servicesCompleted === numServices) {

                                log(numServices + ' requests of ' + size + ' KB have been processed in ' +
                                    timePoint + ' s (' + (numServices/timePoint) + ' requests/s)');

                                //Kill consumers
                                for (var i = 0; i < children.length; i++) {
                                    process.kill(children[i].pid);
                                }

                                serverFactory.closeServer(server, callback);
                            }
                        }
                    );
                }
            };

            //Queue the petitions
            for (var i = 0; i < numServices; i++) {
                client.client('localhost', 3001, 'http://localhost:5001', processPetitions);
            }
        });
    });
};

var nTimes = 0;

function executeTest() {
    'use strict';

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