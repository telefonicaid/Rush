var childProcess = require('child_process');
var pf = require('performanceFramework');
var client = require('./client.js');
var config = require('./config.js');
var serverFactory = require('./server.js');
var redisUtils = require('./redisUtils.js');

var NUM_SERVICES = config.flushingQueues.numServices;
var NUM_CONSUMERS = config.flushingQueues.numConsumers;
var TIME_OUT = 0;

var scenario = pf.describe(config.flushingQueues.pf.name, config.flushingQueues.pf.description,
    config.flushingQueues.pf.template, config.flushingQueues.pf.axis, config.flushingQueues.pf.monitors,
    config.flushingQueues.pf.folder);


var doOneTest = function (size, callback) {
  'use strict';

  //First of all, we must flush redis
  redisUtils.flushBBDD(function () {

    scenario.test('Payload of ' + size + ' B', function (log, point) {

      var children = [];
      var servicesQueued = 0;
      var servicesCompleted = 0;
      var initialTime;

      var processPetitions = function () {

        servicesQueued++;

        if (servicesQueued === NUM_SERVICES) {
          var server = serverFactory.createServer(TIME_OUT, size,

              //Launch consumers when the server is up
              function () {

                initialTime = new Date().valueOf();

                //Launch consumers
                for (var i = 0; i < NUM_CONSUMERS; i++) {
                  children.push(childProcess.fork('../src/consumer.js'));
                }
              },

              //Control the number of processed services
              function () {

                servicesCompleted++;
                var timePoint = (new Date().valueOf() - initialTime) / 1000;

                if ((servicesCompleted % 100) === 0) {
                  point(timePoint, servicesCompleted);
                  log(servicesCompleted + ' services completed ' + timePoint + ' seconds later');
                }

                if (servicesCompleted === NUM_SERVICES) {

                  log(NUM_SERVICES + ' requests of ' + size + ' B have been processed in ' +
                      timePoint + ' s (' + (NUM_SERVICES / timePoint) + ' requests/s)');

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
      for (var i = 0; i < NUM_SERVICES; i++) {
        client.client('localhost', 3001, 'http://localhost:5001', processPetitions);
      }
    });
  });
};

var testsSeries = function (startNumBytes, maxBytes, interval) {

  var bytes = startNumBytes;

  var doNTimes = function () {

    doOneTest(bytes, function () {
      bytes += interval;

      if (bytes <= maxBytes) {
        doNTimes();
      } else {
        scenario.done();
        redisUtils.closeConnection();
      }
    });
  };

  doNTimes();
};

testsSeries(config.flushingQueues.startNumBytes, config.flushingQueues.maxNumBytes,
    config.flushingQueues.bytesInterval);