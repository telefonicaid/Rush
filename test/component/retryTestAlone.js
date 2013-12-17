var should = require('should');
var chai = require('chai');
var redis = require('redis');
var superagent = require('superagent');
var config = require('./config.js');
var configBase = require('../../lib/configTest.js');
var async = require('async');
var processLauncher = require('../processLauncher');

var expect = chai.expect;

var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;
var URL_RUSH = 'http://' + HOST + ':' + PORT;

var consumer = new processLauncher.consumerLauncher();
var listener = new processLauncher.listenerLauncher();

var REDIS_HOST = config.redisServer.host;
var REDIS_PORT = config.redisServer.port;

var QUEUE = 'wrL:hpri'; //Task
var BUCKET_PREFIX = 'bucket';
var FIRST_CHARCODE = 'A'.charCodeAt(0); //Needed to auto-create bucket names (bucketA, bucketB,...)

var CONTENT = 'Retry Test',
      APPLICATION_CONTENT = 'application/json',
      ENDPOINT = 'FAKEENDPOINT';

var TIMEOUT = 1000;
var CHECKINTERVAL = 200;


function getBucketName(index) {
  return BUCKET_PREFIX + String.fromCharCode(FIRST_CHARCODE + index) + ':' + QUEUE;
}

var monitorQueue = function(num, rc, queueName, callback){

  var called = false;

  var getAll = setInterval(function(){
    rc.lrange(queueName, 0, -1, function(err, res){
      console.log(queueName, res.length);
      if(err){
        callback(err);
      }
      else if(res.length === num && !called){
        clearInterval(getAll);
        callback(err, res);
        called = true;
      }
    });
  }, CHECKINTERVAL);

  return getAll;
};

var gotQueue = function(i, callback, err, res){
  callback(i, res);
};

var validScenario = function(data){

  it(data.name, function(done){

    var agent = superagent.agent();
    var rc = redis.createClient(REDIS_PORT, REDIS_HOST);
    rc.select(configBase.selectedDB);
    rc.flushall();

    var currBucket = 0;
    var functions = [];

    function makeRetryTest(i){
      return function(done){
        monitorQueue(data.numTrans, rc, getBucketName(i), gotQueue.bind({}, i, function(order, res){
          expect(order).to.equal(i);
          expect(res.length).to.equal(data.numTrans);
          done();
        }));
      }
    }

    for(var i=0; i<configBase.retryBuckets.length; i++){
      functions.push(makeRetryTest(i));
    }

    async.series(functions, done);


    var headers = {};
    headers['content-type'] = APPLICATION_CONTENT;
    headers['X-Relayer-Host'] = ENDPOINT;
    headers['X-relayer-retry'] = 3;
    headers['X-relayer-persistence'] = 'STATUS';


    for(var i = 0; i< data.numTrans; i++){
      agent.get(URL_RUSH)
      .set(headers)
      .end();
    }
  });
}

describe('Component Test: Task queue', function () {
  'use strict';

  this.timeout(80000);

  before(function (done) {
    listener.start(function(){
      consumer.start(done);
    });
  });

  after(function (done) {
    listener.stop(function(){
      consumer.stop(done);
    });
  });

  beforeEach(function(done){
    setTimeout(done, 5000);
  });

  var dataSet = [
    {name : "Scenario 1: Should move the transaction between buckets with 1 tansaction", numTrans : 1},
    {name : "Scenario 2: Should move the transaction between buckets with 10 tansaction", numTrans : 10},
    {name : "Scenario 3: Should move the transaction between buckets with 20 tansaction", numTrans : 20},
    {name : "Scenario 4: Should move the transaction between buckets with 50 tansaction", numTrans : 50}
  ];

  for(var i=0; i<dataSet.length; i++){
    validScenario(dataSet[i]);
  }

});
