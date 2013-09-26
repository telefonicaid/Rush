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

function _validScenario(data){

  var values = [];
  var counter = 0, value;

  while((counter + (value = _.random(0, globalConfig.maxRetryTime))) <= globalConfig.maxRetryTime) {
    counter += value;
    values.push(value)
  }

  values.push(globalConfig.maxRetryTime - counter);

  var times = values.toString();

  it(data.name, function(done){
    var agent = superagent.agent();
    var id;

    var method;
    switch(data.method){
      case "DELETE":
        method = 'del';
        break;
      default:
        method = data.method.toLowerCase()
    }
    var req = agent
      [method](RUSHENDPOINT + data.path )
      .set('x-relayer-host', ENDPOINT)  //Always the same endpoint
      .set('x-relayer-persistence','BODY')
      .set('content-type','application/json')
      .set('x-relayer-retry', times)
      .set(data.headers)
      if(data.method === 'POST' || data.method === 'PUT'){
        req = req.send(data.body);
      }
      req.end(function(err, res) {
        expect(err).to.not.exist;
        expect(res.statusCode).to.eql(CREATED);
        expect(res.body).to.exist;
        expect(res.body.id).to.exist;
        id=res.body.id;
        res.text.should.not.include('exception');
        done();
      });
  });
}

function _invalidScenario(data){

  var values = [];
  var counter = 0, value;
  var maxRetry = globalConfig.maxRetryTime;

  while((counter + (value = _.random(0, maxRetry))) <= maxRetry) {
    counter += value;
    values.push(value)
  }

  values.push(maxRetry - counter + _.random(0, maxRetry));

  var times = values.toString();

  it(data.name +  ' #FPT', function(done){
    var agent = superagent.agent();
    var id;

    var method;
    switch(data.method){
      case "DELETE":
        method = 'del';
        break;
      default:
        method = data.method.toLowerCase()
    }
    var req = agent
      [method](RUSHENDPOINT + data.path )
      .set('x-relayer-host', ENDPOINT)  //Always the same endpoint
      .set('x-relayer-persistence','BODY')
      .set('content-type','application/json')
      .set('x-relayer-retry', times)
      .set(data.headers)
      if(data.method === 'POST' || data.method === 'PUT'){
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

describe('Single Feature: Max Retry', function() {
  this.timeout(6000);

  before(function (done) {
    listener.start(done);
  });

  after(function (done) {
    var rc = redisModule.createClient(globalConfig.queue.redisPort, globalConfig.queue.redisHost);
    rc.flushall(function(){
      listener.stop(done);
    });
    rc.quit();
  });

  describe('Max ', function () {

    var dataSet = [
      {method: 'GET', path: '/', headers: {'X-Relayer-Protocol':'http'}, body: {}, name : "1 Should accept the request using HTTP /GET"},
      {method: 'POST', path: '/', headers: {'X-Relayer-Protocol':'http'}, body: {}, name : "2 Should accept the request using HTTP /POST"},
      {method: 'PUT', path: '/', headers: {'X-Relayer-Protocol':'http'}, body: {}, name : "3 Should accept the request using HTTP /PUT"},
      {method: 'DELETE', path: '/', headers: {'X-Relayer-Protocol':'http'}, body: {}, name : "4 Should accept the request using HTTP /DELETE"},
      {method: 'GET', path: '/', headers: {'X-Relayer-Protocol':'https'}, body: {}, name : "5 Should accept the request using HTTPS /GET"},
      {method: 'POST', path: '/', headers: {'X-Relayer-Protocol':'https'}, body: {}, name : "6 Should accept the request using HTTPS /POST"},
      {method: 'PUT', path: '/', headers: {'X-Relayer-Protocol':'https'}, body: {}, name : "7 Should accept the request using HTTPS /PUT"},
      {method: 'DELETE', path: '/', headers: {'X-Relayer-Protocol':'https'}, body: {}, name : "8 Should accept the request using HTTPS /DELETE"}
    ];

    for(i=0; i < dataSet.length; i++){
      _validScenario(dataSet[i]);  //Launch every test in data set
    }
  });

  describe('Retrieve request with a valid header policy request using HTTP ', function () {

    var dataSetPOST = [
      {method: 'GET', path: '/', headers: {'X-Relayer-Protocol':'http'}, body: {}, name : "1 Should NOTaccept the request using HTTP /GET"},
      {method: 'POST', path: '/', headers: {'X-Relayer-Protocol':'http'}, body: {}, name : "2 Should NOT accept the request using HTTP /POST"},
      {method: 'PUT', path: '/', headers: {'X-Relayer-Protocol':'http'}, body: {}, name : "3 Should NOT accept the request using HTTP /PUT"},
      {method: 'DELETE', path: '/', headers: {'X-Relayer-Protocol':'http'}, body: {}, name : "4 Should NOT accept the request using HTTP /DELETE"},
      {method: 'GET', path: '/', headers: {'X-Relayer-Protocol':'https'}, body: {}, name : "5 Should NOT accept the request using HTTPS /GET"},
      {method: 'POST', path: '/', headers: {'X-Relayer-Protocol':'https'}, body: {}, name : "6 Should NOT accept the request using HTTPS /POST"},
      {method: 'PUT', path: '/', headers: {'X-Relayer-Protocol':'https'}, body: {}, name : "7 Should NOT accept the request using HTTPS /PUT"},
      {method: 'DELETE', path: '/', headers: {'X-Relayer-Protocol':'https'}, body: {}, name : "8 Should NOT accept the request using HTTPS /DELETE"}
    ];

    for(i=0; i < dataSetPOST.length; i++){
      _invalidScenario(dataSetPOST[i]);  //Launch every test in data set
    }
  });


});

//TODO: path different to empty
