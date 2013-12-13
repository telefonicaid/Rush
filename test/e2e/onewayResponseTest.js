var http = require('http');
var should = require('should');
var config = require('./config.js');
var server = require('./simpleServer.js');
var utils = require('./utils.js');
var dbUtils = require('../dbUtils.js');


var consumer = require('../consumerLauncher.js');
var listener = require('../listenerLauncher.js');

var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;

describe('Multiple Feature: ONEWAY Response errors #FOW', function() {
  'use strict';

  var options;

  before(function (done) {
    listener.start(function() {
      consumer.start(done);
    });
  });

  after(function (done) {
    listener.stop(function() {
      consumer.stop(done);
    });
    dbUtils.exit();
  });

  beforeEach(function(done) {
    options = {};
    options.host = HOST;
    options.port = PORT;
    options.method = 'POST';
    options.headers = {};
    options.headers['content-type'] = 'application/json';

    dbUtils.cleanDb(done);
  });

  it('Case 1 Should return protocol error / FTP  #FOW', function(done) {
    options.headers['X-Relayer-Host'] = 'localhost:3001';
    options.headers['X-Relayer-Protocol'] = 'ftp';
    utils.makeRequest(options, 'Protocol error test', function(e, data) {

      var parsedData = JSON.parse(data);
      parsedData.should.have.property('exceptionId', 'SVC0003');
      parsedData.should.have.property('exceptionText', 'Invalid parameter value: x-relayer-protocol. ' +
          'Possible values are: http, https');

      done();
    });
  });


  it('Case 2 Should return invalid host error / Invalid relayer host  #FOW', function(done) {
    options.headers['X-Relayer-Host'] = 'http://localhost:2001';
    utils.makeRequest(options, 'host error test', function(e, data) {

      var parsedData = JSON.parse(data);
      parsedData.should.have.property('exceptionId', 'SVC0002');
      parsedData.should.have.property('exceptionText', 'Invalid parameter value: x-relayer-host');
      parsedData.should.have.property('userMessage', 'Valid format: host[:port]');

      done();
    });
  });

  it('Case 3 Should return invalid host error / Invalid relayer port  #FOW', function(done) {
    options.headers['X-Relayer-Host'] = 'localhost:65536';
    utils.makeRequest(options, 'host error test', function(e, data) {

      var parsedData = JSON.parse(data);
      parsedData.should.have.property('exceptionId', 'SVC0002');
      parsedData.should.have.property('exceptionText', 'Invalid parameter value: x-relayer-host');
      parsedData.should.have.property('userMessage', 'Port should be a number between 0 and 65535');

      done();
    });
  });

  it('Case 4 Should return invalid proxy error / Invalid proxy host  #FOW', function(done) {
    options.headers['X-Relayer-Host'] = 'localhost:2001';
    options.headers['X-Relayer-Proxy'] = 'http://localhost:2001';
    utils.makeRequest(options, 'proxy error test', function(e, data) {

      var parsedData = JSON.parse(data);
      parsedData.should.have.property('exceptionId', 'SVC0002');
      parsedData.should.have.property('exceptionText', 'Invalid parameter value: x-relayer-proxy');
      parsedData.should.have.property('userMessage', 'Valid format: host[:port]');

      done();
    });
  });

  it('Case 5 Should return invalid proxy error / Invalid proxy port  #FOW', function(done) {
    options.headers['X-Relayer-Host'] = 'localhost:2001';
    options.headers['X-Relayer-Proxy'] = 'localhost:65536';
    utils.makeRequest(options, 'proxy error test', function(e, data) {

      var parsedData = JSON.parse(data);
      parsedData.should.have.property('exceptionId', 'SVC0002');
      parsedData.should.have.property('exceptionText', 'Invalid parameter value: x-relayer-proxy');
      parsedData.should.have.property('userMessage', 'Port should be a number between 0 and 65535');

      done();
    });
  });

  it('Case 6 Should return invalid host error / Missing x-relayer-host parameter  #FOW', function(done) {
    options.headers['X-Relayer-Host'] = '';
    utils.makeRequest(options, 'host error test', function(e, data) {

      var parsedData = JSON.parse(data);
      parsedData.should.have.property('exceptionId', 'SVC1000');
      parsedData.should.have.property('exceptionText', 'Missing mandatory parameter: x-relayer-host');

      done();
    });
  });

  it('Case 7 Should return invalid host error / Invalid format  #FOW', function(done) {
    options.headers['X-Relayer-Host'] = ':8888';
    utils.makeRequest(options, 'host error test', function(e, data) {

      var parsedData = JSON.parse(data);
      parsedData.should.have.property('exceptionId', 'SVC0002');
      parsedData.should.have.property('exceptionText', 'Invalid parameter value: x-relayer-host');
      parsedData.should.have.property('userMessage', 'Valid format: host[:port]');

      done();
    });
  });

  it('Case 8 Should return invalid host error / Invalid relayer format  #FOW', function(done) {
    options.headers['X-Relayer-Host'] = 'localhost:8888/test';
    utils.makeRequest(options, 'host error test', function(e, data) {

      var parsedData = JSON.parse(data);
      parsedData.should.have.property('exceptionId', 'SVC0002');
      parsedData.should.have.property('exceptionText', 'Invalid parameter value: x-relayer-host');
      parsedData.should.have.property('userMessage', 'Valid format: host[:port]');

      done();
    });
  });


  it('Case 9 Should return X-Relayer-Host missing error  #FOW', function(done) {
    delete options.headers['X-Relayer-Host'];
    utils.makeRequest(options, 'X-Relayer-Host missing test', function(e, data) {

      var parsedData = JSON.parse(data);
      parsedData.should.have.property('exceptionId', 'SVC1000');
      parsedData.should.have.property('exceptionText', 'Missing mandatory parameter: x-relayer-host');

      done();
    });
  });

  it('Case 10 Should not return an error. Should accept the request / protocol error http  #FOW', function(done) {
    options.headers['X-Relayer-Host'] = 'localhost:3001';
    options.headers['X-Relayer-protocol'] = 'http';
    utils.makeRequest(options, 'Protocol error test', function(e, data) {
      var parsedJSON = JSON.parse(data);
      parsedJSON.should.have.property('id');
      parsedJSON.should.not.have.property('exceptionId');
      done();
    });
  });

  it('Case 11 Should not return an error. Should accept the request / protocol error https  #FOW', function(done) {
    options.headers['X-Relayer-Host'] = 'localhost:3001';
    options.headers['X-Relayer-protocol'] = 'https';
    utils.makeRequest(options, 'Protocol error test', function(e, data) {
      var parsedJSON = JSON.parse(data);
      parsedJSON.should.have.property('id');
      parsedJSON.should.not.have.property('exceptionId');
      done();
    });
  });

  it('Case 12 Should not return an error. Should accept the request / protocol error port  #FOW', function(done) {
    options.headers['X-Relayer-Host'] = 'localhost';
    utils.makeRequest(options, 'Protocol error test', function(e, data) {
      var parsedJSON = JSON.parse(data);
      parsedJSON.should.have.property('id');
      parsedJSON.should.not.have.property('exceptionId');
      done();
    });
  });

  it('Case 13 Should not return an error. Should accept the request / protocol error https port  #FOW', function(done) {
    options.headers['X-Relayer-Host'] = 'localhost';
    options.headers['X-Relayer-protocol'] = 'https';
    utils.makeRequest(options, 'Protocol error test', function(e, data) {
      var parsedJSON = JSON.parse(data);
      parsedJSON.should.have.property('id');
      parsedJSON.should.not.have.property('exceptionId');
      done();
    });
  });

  it('Case 14 Should return an ID when GET /response/:id and X-Relayer-Host header is defined  #FOW', function(done) {
    options.headers['X-Relayer-Host'] = 'localhost';
    options.headers['X-Relayer-protocol'] = 'https';
    utils.makeRequest(options, 'Protocol error test', function(e, data, res) {
      res.statusCode.should.be.equal(201);
      var parsedJSON = JSON.parse(data);
      parsedJSON.should.have.property('id');
      Object.keys(parsedJSON).length.should.be.equal(1);
      done();
    });
  });

  it('Case 15 invalid persistence type should throw error  #FOW', function(done) {
    var id;

    var options2 = options;
    options2.headers['X-Relayer-Host'] = 'notAServer:8014';
    options2.headers['X-Relayer-Persistence'] = 'INVALID';

    utils.makeRequest(options2, 'body request', function(err, res) {
      should.not.exist(err);
      var jsonRes = JSON.parse(res);
      jsonRes.should.have.property('exceptionId', 'SVC0003');
      jsonRes.should.have.property('exceptionText', 'Invalid parameter value: x-relayer-persistence. Possible ' +
          'values are: BODY, STATUS, HEADER');
      done();

    });
  });

  it('Case 16 invalid retry parameter should throw error  #FOW', function(done) {
    var id;
    options.headers['X-Relayer-Host'] = 'notAServer:8014';
    options.headers['X-Relayer-Retry'] = '5,4,8';

    utils.makeRequest(options, 'body request', function(err, res) {
      should.not.exist(err);
      var jsonRes = JSON.parse(res);
      jsonRes.should.have.property('exceptionId', 'SVC0002');
      jsonRes.should.have.property('exceptionText', 'Invalid parameter value: x-relayer-retry');
      jsonRes.should.have.property('userMessage', 'Invalid retry value: 5,4,8');

      done();
    });
  });

  it('Case 17 invalid httpcallback should throw error / callback url empty  #FOW', function(done) {
    var id;
    options.headers['X-Relayer-Host'] = 'notAServer:8014';
    options.headers['X-Relayer-httpcallback'] = 'http://';

    utils.makeRequest(options, 'body request', function(err, res) {
      should.not.exist(err);
      var jsonRes = JSON.parse(res);
      jsonRes.should.have.property('exceptionId', 'SVC0002');
      jsonRes.should.have.property('exceptionText', 'Invalid parameter value: x-relayer-httpcallback');
      done();
    });
  });

  it('Case 18 invalid httpcallback should throw error / invalid url #FOW', function(done) {
    var id;
    options.headers['X-Relayer-Host'] = 'notAServer:8014';
    options.headers['X-Relayer-httpcallback'] = 'localhost:8000';

    utils.makeRequest(options, 'body request', function(err, res) {
      should.not.exist(err);
      var jsonRes = JSON.parse(res);
      jsonRes.should.have.property('exceptionId', 'SVC0002');
      jsonRes.should.have.property('exceptionText', 'Invalid parameter value: x-relayer-httpcallback');
      done();
    });
  });

  it('Case 19 invalid httpcallback should throw error / invalid protocol #FOW', function(done) {
    var id;
    options.headers['X-Relayer-Host'] = 'notAServer:8014';
    options.headers['X-Relayer-httpcallback'] = 'https://localhost:8000';

    utils.makeRequest(options, 'body request', function(err, res) {
      should.not.exist(err);
      var jsonRes = JSON.parse(res);
      jsonRes.should.have.property('exceptionId', 'SVC0002');
      jsonRes.should.have.property('exceptionText', 'Invalid parameter value: x-relayer-httpcallback');
      done();
    });
  });
});
