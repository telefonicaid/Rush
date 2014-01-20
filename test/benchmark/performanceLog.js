var performance = require('performanceFramework');
var redis = require('redis');
var config = require('./config.js');
var http = require('http');
var simpleServer = require('./simpleServer.js');

var listener = require('../../lib/listener.js');
var consumer = require('../../lib/consumer.js');

var ENDPOINT = config.targetServer.host + ":" + config.targetServer.port;

var numberRequests = 20000;
var numberRequestsCompleted = 0;

var interval = 200;

var scenario1 = performance.describe("Test against server, node version " +  process.versions.node, "Check flush queue performance and time to complete requests (30ms of delay with FileLogger)", "bootstrap", ['Time (ms)', 'Number of requests/transactions left'], [], ".");


var fillQueue = function(done){

  var left = numberRequests;

  var options = {
    host: 'localhost',
    path: '/',
    port: '5001',
    method: 'GET',
    headers : {'x-relayer-host' : ENDPOINT}
  };

  listener.start(function(){
    process.nextTick(doOne);
  });


  function doOne(){
    var req = http.request(options, function(response){
      response.on('end', function(data) {
        left--;
        if(left > 0){
          process.nextTick(doOne);
        }
        else {
          listener.stop(done);
        }
      });
    });
    req.end();
  }
}

function firstTest(){
  return function(){
    var rc = redis.createClient(config.redisServer.port, config.redisServer.host);

    var log2, point2;

    scenario1.test('Requests left', function(log, point){
      log2 = log;
      point2 = point;
    });

    consumer.start(function(){
      scenario1.test('transactions left', function(log1,point1){
      var moment = 0;

      var checkInterval = setInterval(function(){
        rc.llen('wrL:hpri', function (m, err, value) {

          point1(m, value);
          var tps = ((numberRequests - value) / m) * 1000;
          log1((numberRequests - value) + " transactions in " + m + "ms (" + tps + " tps)");
          if (value === 0){
            rc.quit();
          }

        }.bind({},moment));

        point2(moment, numberRequestsCompleted);
        var tps = (numberRequestsCompleted / moment) * 1000;
        log2(numberRequestsCompleted + " requests in " + moment + "ms (" + tps + " tps)");
        if(numberRequestsCompleted === numberRequests){
          clearInterval(checkInterval);
          scenario1.done();
        }

        moment += interval;
      }, interval);
      });
    });
  }
}

function secondTest(){
  return interval;
}


var srv = simpleServer.serverListener(function(){
  fillQueue(function(){
    firstTest()();
  });
}, function(){
  numberRequestsCompleted++;
  if(numberRequestsCompleted === numberRequests){
    srv.close();
  }
})
