var should = require('should');
var superagent = require('superagent');
var config = require('./config');
var globalConfig = require('../../lib/configBase.js');
var _ = require('underscore');
var chai = require('chai');
var expect = chai.expect;
var redisModule = require('redis');

var listener = require('../../lib/listener.js');

//RUSH ENDPOINT
var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;
var RUSHENDPOINT = 'http://' + HOST + ':' + PORT;

//Final host endpoint
var fhHOST = config.simpleServerHostname;
var fhPORT = config.simpleServerPort;

ENDPOINT = fhHOST + ':' + fhPORT;

// Time to wait to check the status of the task
var TIMEOUT = 600;
var CREATED = 201;
var describeTimeout = 5000;

function _validScenario(data) {
  'use strict';

  var values = [];
  var counter = 0, value;

  while ((counter + (value = _.random(0, globalConfig.maxRetryTime))) <= globalConfig.maxRetryTime) {
    counter += value;
    values.push(value);
  }

  values.push(globalConfig.maxRetryTime - counter);

  var times = values.toString();


	it(data.name + ' /' + data.method + ' #FRT', function(done) {
    var agent = superagent.agent();
    var id;

    var method;
    switch (data.method) {
    case 'DELETE':
      method = 'del';
      break;
    default:
      method = data.method.toLowerCase();
    }
    var req = agent[method](RUSHENDPOINT + data.path)
        .set('x-relayer-host', ENDPOINT)  //Always the same endpoint
        .set('x-relayer-persistence', 'BODY')
        .set('content-type', 'application/json')
        .set('x-relayer-retry', times)
        .set(data.headers);
    if (data.method === 'POST' || data.method === 'PUT') {
      req = req.send(data.body);
    }
    req.end(function(err, res) {
      expect(err).to.not.exist;
      expect(res.statusCode).to.eql(CREATED);
      expect(res.body).to.exist;
      expect(res.body.id).to.exist;
      id = res.body.id;
      res.text.should.not.include('exception');
      done();
    });
  });
}

function _invalidScenario(data) {
  'use strict';

  var values = [];
  var counter = 0, value;
  var maxRetry = globalConfig.maxRetryTime;

  while ((counter + (value = _.random(0, maxRetry))) <= maxRetry) {
    counter += value;
    values.push(value);
  }

  values.push(maxRetry - counter + _.random(0, maxRetry));

  var times = values.toString();

	//it(data.name, function(done){
	//it(data.name + data.protocol.toUpperCase() + ' /' +data.method + ' #FRT', function(done){
	it(data.name + ' /' + data.method + ' #FRT', function(done) {
    var agent = superagent.agent();
    var id;

    var method;
    switch (data.method) {
    case 'DELETE':
      method = 'del';
      break;
    default:
      method = data.method.toLowerCase();
    }
    var req = agent[method](RUSHENDPOINT + data.path)
        .set('x-relayer-host', ENDPOINT)  //Always the same endpoint
        .set('x-relayer-persistence', 'BODY')
        .set('content-type', 'application/json')
        .set('x-relayer-retry', times)
        .set(data.headers);
    if (data.method === 'POST' || data.method === 'PUT') {
      req = req.send(data.body);
    }
    req.end(function(err, res) {
      expect(err).to.not.exist;
      expect(res.statusCode).to.eql(400);
      expect(res.body).to.exist;
      expect(res.body.exceptionId).to.eql('SVC0002');
      expect(res.body.exceptionText).to.eql('Invalid parameter value: x-relayer-retry');
      expect(res.body.userMessage).to.eql('The sum of the different intervals must be less than ' + maxRetry + ' ms');
      done();
    });
  });
}

describe('Multiple Feature: Maximum Retry value', function() {
  'use strict';
  this.timeout(TIMEOUT);

  before(function(done) {
    listener.start(done);
  });

  after(function(done) {
    var rc = redisModule.createClient(globalConfig.queue.redisPort, globalConfig.queue.redisHost);
    rc.flushall(function() {
      listener.stop(done);
    });
    rc.quit();
  });

  describe('Retrieve requests with a valid RETRY headers policy ', function() {

    var dataSet = [
      {method: 'GET', path: '/', headers: {'X-Relayer-Protocol': 'http'}, body: {},
        name: 'Case 1 Should accept the request using HTTP '},
      {method: 'POST', path: '/', headers: {'X-Relayer-Protocol': 'http'}, body: {},
        name: 'Case 2 Should accept the request using HTTP '},
      {method: 'PUT', path: '/', headers: {'X-Relayer-Protocol': 'http'}, body: {},
        name: 'Case 3 Should accept the request using HTTP '},
      {method: 'DELETE', path: '/', headers: {'X-Relayer-Protocol': 'http'}, body: {},
        name: 'Case 4 Should accept the request using HTTP '},
      {method: 'GET', path: '/', headers: {'X-Relayer-Protocol': 'https'}, body: {},
        name: 'Case 5 Should accept the request using HTTPS '},
      {method: 'POST', path: '/', headers: {'X-Relayer-Protocol': 'https'}, body: {},
        name: 'Case 6 Should accept the request using HTTPS '},
      {method: 'PUT', path: '/', headers: {'X-Relayer-Protocol': 'https'}, body: {},
        name: 'Case 7 Should accept the request using HTTPS '},
      {method: 'DELETE', path: '/', headers: {'X-Relayer-Protocol': 'https'}, body: {},
        name: 'Case 8 Should accept the request using HTTPS '}
    ];

    for (var i = 0; i < dataSet.length; i++) {
      _validScenario(dataSet[i]);  //Launch every test in data set
    }
  });

  describe('Retrieve requests with a valid RETRY headers policy over the MAXIMUM set', function() {

    var dataSetPOST = [
      {method: 'GET', path: '/', headers: {'X-Relayer-Protocol': 'http'}, body: {},
        name: 'Case 1 Should NOT accept the request using HTTP '},
      {method: 'POST', path: '/', headers: {'X-Relayer-Protocol': 'http'}, body: {},
        name: 'Case 2 Should NOT accept the request using HTTP '},
      {method: 'PUT', path: '/', headers: {'X-Relayer-Protocol': 'http'}, body: {},
        name: 'Case 3 Should NOT accept the request using HTTP '},
      {method: 'DELETE', path: '/', headers: {'X-Relayer-Protocol': 'http'}, body: {},
        name: 'Case 4 Should NOT accept the request using HTTP '},
      {method: 'GET', path: '/', headers: {'X-Relayer-Protocol': 'https'}, body: {},
        name: 'Case 5 Should NOT accept the request using HTTPS '},
      {method: 'POST', path: '/', headers: {'X-Relayer-Protocol': 'https'}, body: {},
        name: 'Case 6 Should NOT accept the request using HTTPS '},
      {method: 'PUT', path: '/', headers: {'X-Relayer-Protocol': 'https'}, body: {},
        name: 'Case 7 Should NOT accept the request using HTTPS '},
      {method: 'DELETE', path: '/', headers: {'X-Relayer-Protocol': 'https'}, body: {},
        name: 'Case 8 Should NOT accept the request using HTTPS '}
    ];

    for (var i = 0; i < dataSetPOST.length; i++) {
      _invalidScenario(dataSetPOST[i]);  //Launch every test in data set
    }
  });


});

//TODO: path different to empty
