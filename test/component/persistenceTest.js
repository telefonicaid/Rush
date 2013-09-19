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

var listener = require('../../lib/listener.js');
var consumer = require('../../lib/consumer.js');

var serversToShutDown = [];

var REDIS_HOST = config.redisServer.host;
var REDIS_PORT = config.redisServer.port;

var URL_RUSH = 'http://' + HOST + ':' + PORT;
var ENDPOINT = config.simpleServerHostname + ':' + config.simpleServerPort;
var FAKEENDPOINT = 'FAKEENDPOINT';

var ALL_HEADERS = [
  "x-relayer-persistence",
  "x-relayer-httpcallback",
  "x-relayer-httpcallback-error",
  "x-relayer-retry",
  "x-relayer-topic",
  "x-relayer-proxy",
  "x-relayer-encoding"
];

function keysToLowerCase(obj){
    Object.keys(obj).forEach(function(key){
        var k=key.toLowerCase();
        if(k!= key){
            obj[k]= obj[key];
            delete obj[key];
        }
    });
    return (obj);
}

function executeTest(method, content, headers, done) {
  'use strict';

  var mymethod;
  switch(method){
    case "DELETE":
      mymethod = 'del';
      break;
    default:
      mymethod = method.toLowerCase()
  }

  var subscriber = redis.createClient(REDIS_PORT, REDIS_HOST);
  subscriber.subscribe('STATE:processing')
  subscriber.subscribe('STATE:completed')
  subscriber.subscribe('STATE:error')
  subscriber.subscribe('STATE:persistence_state');

  var id;

  headers = keysToLowerCase(headers);

  var simpleServer = server.serverListener(
    function onConnected() {
      agent
        [mymethod](URL_RUSH)
        .set('content-type', 'application/json')
        .set(headers)
        .end(function(err, res) {
          expect(err).to.not.exist;
          expect(res.statusCode).to.equal(201); //Status code 201
          expect(res.body).to.exist;
          expect(res.body.id).to.exist;
          id = res.body.id;
        });
    }
  );

  var responses = {};

  subscriber.on('message', function newMessage(channel, message){
    responses[channel] = JSON.parse(message);
  });

  setTimeout(function(){
    testResponses(responses)
  }, 3000);



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
    for(var i=0; i < shouldNotExist.length; i++){                        //there should not be headers in the task that are not in the request
      expect(task.headers).to.not.have.property(shouldNotExist[i]);
    }

    if(headers['x-relayer-host'] === ENDPOINT){
      expect(responses).to.have.property('STATE:completed');
      expect(responses).to.not.have.property('STATE:error');
      if(!headers['x-relayer-persistence']){
        expect(responses).to.not.have.property('STATE:persistence_state');
      }
    }
    else if(headers['x-relayer-host'] === FAKEENDPOINT){
      expect(responses).to.have.property('STATE:error');
      expect(responses).to.not.have.property('STATE:completed');
      expect(responses).to.have.property('STATE:persistence_state');
    }
    serversToShutDown.push(simpleServer);
    subscriber.unsubscribe('message');
    done();
  }
}

describe('Feature: Persistence', function() {

  this.timeout(6000);

  before(function (done) {
    listener.start(function(){
      consumer.start(done);
    });
  });

  after(function (done) {
    listener.stop(function(){
      consumer.start(done);
    });
  });

  afterEach(function() {
    for (var i = 0; i < serversToShutDown.length; i++) {
      try {
        serversToShutDown[i].close();
      } catch (e) {}
    }
    serversToShutDown = [];
  });


  it('1 should return empty body and test-header', function(done) {
    executeTest('GET', '', {'x-relayer-host' : FAKEENDPOINT}, done);
  });
  it('2 should return body and x-relayer-persistence', function(done) {
    executeTest('POST', 'payload', {'x-relayer-host' : ENDPOINT, 'x-relayer-persistence' : 'BODY'}, done);
  });
  it('3 should return empty body and x-relayer-httpcallback', function(done) {
    executeTest('PUT', '', {'x-relayer-host' : ENDPOINT, 'x-relayer-httpcallback' : "http://google.es"}, done);
  });
  it('4 should return empty body and x-relayer-encoding', function(done) {
    executeTest('GET', '', {'x-relayer-host' : FAKEENDPOINT, 'x-relayer-encoding' : "base64"}, done);
  });
  it('5 should return empty body and x-relayer-encoding', function(done) {
    executeTest('POST', '', {'x-relayer-host' : ENDPOINT, 'x-relayer-encoding' : "base64"}, done);
  });
  it('6 should return empty body and x-relayer-topic', function(done) {
    executeTest('DELETE', '', {'x-relayer-host' : FAKEENDPOINT, 'x-relayer-topic' : "base64"}, done);
  });
  it('7 should return empty body and x-relayer-topic', function(done) {
    executeTest('GET', '', {'x-relayer-host' : ENDPOINT, 'x-relayer-topic' : "try"}, done);
  });
});

