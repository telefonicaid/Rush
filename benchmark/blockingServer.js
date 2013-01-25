var pf = require('performanceFramework');
var client = require('./client.js');
var config = require('./config.js');
var server = require('./server.js');
var redisUtils = require('./redisUtils.js');


var TEST_TIME = config.blockingServer.time;
var MONITOR_INTERVAL = 500;

var scenario = pf.describe(config.blockingServer.pf.name, config.blockingServer.pf.description,
    config.blockingServer.pf.template, config.blockingServer.pf.axis, config.blockingServer.pf.monitors,
    config.blockingServer.pf.folder);

var doOneTest = function (time, callback) {

  scenario.test('Blocking server ' + time + 'ms', function (log, point) {
    'use strict';

    var area = 0;
    var i = 0;

    var monitorInterval = setInterval(function () {
      redisUtils.monitorQueue('wrL:hpri', function (i, value) {
        console.log(value + ' services pending');
        point(i, value);
        area += value / 400;
      }.bind(null, i));
      i++;
    }, MONITOR_INTERVAL);

    var curr_srv = server.createServer(time, 0, function () {
      var completed = 0;

      function doReq(i) {
        client.client('localhost', 3001, "http://localhost:5001");
        i++;

        if (i < config.blockingServer.numPetitions) {
          setTimeout(function () {
            doReq(i);
          }, 10);
        }
      }

      doReq(0);
    });

    setTimeout(function () {
      //log(area);

      server.closeServer(curr_srv, function () {
        redisUtils.flushBBDD(callback);
      });

      clearInterval(monitorInterval);
    }, TEST_TIME);
  });
};

var testsSeries = function (startDelay, maxDelay, interval) {

  var delay = startDelay;

  var doNTimes = function () {
    console.log('test starting...');

    doOneTest(delay, function () {
      delay += interval;

      if (delay <= maxDelay) {
        doNTimes();
      } else {
        scenario.done();
        redisUtils.closeConnection();
      }
    });
  };

  doNTimes();
};

testsSeries(config.blockingServer.startDelay, config.blockingServer.maxDelay,
    config.blockingServer.delayInterval);
