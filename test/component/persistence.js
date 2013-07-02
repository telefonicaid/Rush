var should = require('should');
var chai = require('chai');
var superagent = require('superagent');
var config = require('./config.js');
var redis = require('redis');
var _ = require('underscore');
var server = require('./simpleServer.js');
var agent = require('superagent');

var expect = chai.expect;

var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;

var REDIS_HOST = config.redisServer.host;
var REDIS_PORT = config.redisServer.port;

var URL_RUSH = 'http://' + HOST + ':' + PORT;
var ENDPOINT = 'http://' + config.simpleServerHostname + ':' + config.simpleServerPort;
var FAKEENDPOINT = 'http://FAKEENDPOINT';

var ALL_HEADERS = [
  "x-relayer-persistence",
  "x-relayer-httpcallback",
  "x-relayer-httpcallback-error",
  "x-relayer-retry",
  "x-relayer-topic",
  "x-relayer-proxy",
  "x-relayer-encoding"
];

function executeTest(method, content, newHeaders, persistence, done) {
  'use strict';

  var subscriber = redis.createClient(REDIS_PORT, REDIS_HOST);
  subscriber.subscribe('STATE:processing')
  subscriber.subscribe('STATE:completed')
  subscriber.subscribe('STATE:error')
  subscriber.subscribe('STATE:persistence_state');

  var id, headers = {};

  headers = {};
  headers['content-type'] = 'application/json';
  headers['X-Relayer-Host'] = ENDPOINT;
  headers['X-relayer-persistence'] = persistence;

  _.extend(headers, newHeaders);

  console.log(headers);
  server.serverListener(
    function onConnected() {
      agent
          [method.toLowerCase()](URL_RUSH)
          .set(headers)
          .end(function(err, res) {
        expect(err).to.not.exist;
        expect(res.statusCode).to.equal(200); //Status code 200
        expect(res.body).to.exist;
        expect(res.body.id).to.exist;
        id = res.body.id;
      });
    }
  );

  var responses = {};

  subscriber.on('message', function(channel, message){
    responses[channel] = JSON.parse(message);
    if((channel === 'STATE:completed') && !headers['X-relayer-persistence']){
      subscriber.unsubscribe();
      testResponses(responses);
    }
    if(channel == 'STATE:persistence_state'){
      subscriber.unsubscribe();
      testResponses(responses);
    }
  });

  function testResponses (responses){
    expect(responses).to.have.property('STATE:processing');
    var processing = responses['STATE:processing'];
    expect(processing).to.have.property('id', id);
    expect(processing).to.have.property('state', 'processing');
    expect(processing).to.have.property('task');

    var task = processing.task;

    expect(task).to.have.property('method', method);
    expect(task).to.have.property('headers');

    for(var header in headers){    //every header in the request must be inside the current task
      var head = header.toLowerCase();
      expect(task.headers).to.have.property(head, headers[head]);
    }

    var shouldNotExist = _.difference(ALL_HEADERS, Object.keys(headers)); //headers that aren't in the request
    for(var i=0; i < shouldNotExist.length; i++){                              //there should not be headers in the task that are not in the request
      expect(task.headers).to.not.have.property(shouldNotExist[i]);
    }

    if(headers['X-relayer-host'] === ENDPOINT){
      expect(responses).to.have.property('STATE:completed');
      expect(responses).to.not.have.property('STATE:error');
      if(!headers['X-relayer-persistence']){
        expect(responses).to.not.have.property('STATE:persistence_state');
      }
    }
    else if(headers['X-relayer-host'] === FAKEENDPOINT){
      expect(responses).to.have.property('STATE:error');
      expect(responses).to.not.have.property('STATE:completed');
    }
    done();
  }



}

describe('Feature: Persistence', function() {

  it('should return empty body and test-header', function(done) {
    executeTest('GET', '', {'X-Relayer-Host' : FAKEENDPOINT}, '', done);
  });
});


