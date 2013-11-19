var pf = require('performanceFramework');
var client = require('./client.js');
var config = require('./config.js');
var redisUtils = require('./redisUtils.js');
var server = require('./server.js');

var scenario = pf.describe(config.noLagServer.pf.name, config.noLagServer.pf.description,
    config.noLagServer.pf.template, config.noLagServer.pf.axis, config.noLagServer.pf.monitors,
    config.noLagServer.pf.folder);

scenario.test('Payload of ' + (config.noLagServer.size / (1024 * 1024)) + '  MB', function (log, point) {
  'use strict';
  var i = 0;

  var monitorInterval = setInterval(function () {
    redisUtils.monitorQueue('wrL:hpri', function (i, value) {
      point(i, value);
      console.log(value);
    }.bind(null, i));
    i++;
  }, 1000);

  var server1 = server.createServer(0, config.noLagServer.size, function () {

    var completed = 0;

    function doReq(i) {
      client.client('localhost', config.rushServer.port,
          'http://' + config.targetServer.host + ':' + config.targetServer.port);
      i++;

      if (i < config.noLagServer.numPetitions) {
        setTimeout(function () {
          doReq(i);
        }, 10);
      }
    }

    doReq(0);
  });

  function freeAll() {
    clearInterval(monitorInterval);
    scenario.done();
    redisUtils.closeConnection();
    server.closeServer(server1);
  }

  setTimeout(freeAll, config.blockingServer.time);
});
