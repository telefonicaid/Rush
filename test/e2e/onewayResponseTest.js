var http = require('http');
var should = require('should');
var config = require('./config.js');
var server = require('./simpleServer.js');
var utils = require('./utils.js');

var consumer = require('../../lib/consumer.js');
var listener = require('../../lib/listener.js');

var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;

describe('Feature: Oneway Response errors ', function() {

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
  });

  beforeEach(function(done) {
    options = {};
    options.host = HOST;
    options.port = PORT;
    options.path = '/relay';
    options.method = 'POST';
    options.headers = {};
    options.headers['content-type'] = 'application/json';

    done();
  });

  it('Should return protocol error (test 1)', function(done) {
    options.headers['X-Relayer-Host'] = 'localhost:3001';
    utils.makeRequest(options, 'Protocol error test', function(e, data) {

      var parsedData = JSON.parse(data);
      parsedData.should.have.property('exceptionId', 'SVC0002');
      parsedData.should.have.property('exceptionText', 'Invalid parameter value: x-relayer-host');
      parsedData.should.have.property('userMessage', 'Invalid protocol localhost:');

      done();
    });
  });


  it('Should return protocol error (test 2)', function(done) {
    var relayerHost = 'no protocol';
    options.headers['X-Relayer-Host'] = relayerHost;
    utils.makeRequest(options, 'Protocol error test', function(e, data) {

      var parsedData = JSON.parse(data);
      parsedData.should.have.property('exceptionId', 'SVC0002');
      parsedData.should.have.property('exceptionText', 'Invalid parameter value: x-relayer-host');
      parsedData.should.have.property('userMessage', 'Protocol is not defined');

      done();
    });
  });


  it('Should return invalid host error (test 3)', function(done) {
    options.headers['X-Relayer-Host'] = 'http://';
    utils.makeRequest(options, 'host error test', function(e, data) {

      var parsedData = JSON.parse(data);
      parsedData.should.have.property('exceptionId', 'SVC0002');
      parsedData.should.have.property('exceptionText', 'Invalid parameter value: x-relayer-host');
      parsedData.should.have.property('userMessage', 'Hostname expected. Empty host after protocol');

      done();
    });
  });


  it('Should return invalid host error (test 4)', function(done) {
    options.headers['X-Relayer-Host'] = 'https://';
    utils.makeRequest(options, 'host error test', function(e, data) {

      var parsedData = JSON.parse(data);
      parsedData.should.have.property('exceptionId', 'SVC0002');
      parsedData.should.have.property('exceptionText', 'Invalid parameter value: x-relayer-host');
      parsedData.should.have.property('userMessage', 'Hostname expected. Empty host after protocol');

      done();
    });
  });

  it('Should return invalid host error (test 5)', function(done) {
    options.headers['X-Relayer-Host'] = 'http://:8888';
    utils.makeRequest(options, 'host error test', function(e, data) {

      var parsedData = JSON.parse(data);
      parsedData.should.have.property('exceptionId', 'SVC0002');
      parsedData.should.have.property('exceptionText', 'Invalid parameter value: x-relayer-host');
      parsedData.should.have.property('userMessage', 'Hostname expected. Empty host after protocol');

      done();
    });
  });


  it('Should return X-Relayer-Host missing error', function(done) {
    delete options.headers['X-Relayer-Host'];
    utils.makeRequest(options, 'X-Relayer-Host missing test', function(e, data) {

      var parsedData = JSON.parse(data);
      parsedData.should.have.property('exceptionId', 'SVC1000');
      parsedData.should.have.property('exceptionText', 'Missing mandatory parameter: x-relayer-host');

      done();
    });
  });

  it('Should return invialid protocol', function(done) {
    var protocol = 'ftp:';
    options.headers['X-Relayer-Host'] = protocol + '//localhost:3001';
    utils.makeRequest(options, 'Protocol error test', function(e, data) {

      var parsedData = JSON.parse(data);
      parsedData.should.have.property('exceptionId', 'SVC0002');
      parsedData.should.have.property('exceptionText', 'Invalid parameter value: x-relayer-host');
      parsedData.should.have.property('userMessage', 'Invalid protocol ' + protocol);

      done();
    });
  });

  it('Should not return an error. Should return and ID', function(done) {
    options.headers['X-Relayer-Host'] = 'http://localhost:3001';
    utils.makeRequest(options, 'Protocol error test', function(e, data) {
      var parsedJSON = JSON.parse(data);
      parsedJSON.should.have.property('id');
      parsedJSON.should.not.have.property('exceptionId');
      done();
    });
  });

  it('Should not return an error. Should return and ID', function(done) {
    options.headers['X-Relayer-Host'] = 'https://localhost:3001';
    utils.makeRequest(options, 'Protocol error test', function(e, data) {
      var parsedJSON = JSON.parse(data);
      parsedJSON.should.have.property('id');
      parsedJSON.should.not.have.property('exceptionId');
      done();
    });
  });

  it('Should not return an error. Should return and ID', function(done) {
    options.headers['X-Relayer-Host'] = 'http://localhost';
    utils.makeRequest(options, 'Protocol error test', function(e, data) {
      var parsedJSON = JSON.parse(data);
      parsedJSON.should.have.property('id');
      parsedJSON.should.not.have.property('exceptionId');
      done();
    });
  });

  it('Should not return an error. Should return and ID', function(done) {
    options.headers['X-Relayer-Host'] = 'https://localhost';
    utils.makeRequest(options, 'Protocol error test', function(e, data) {
      var parsedJSON = JSON.parse(data);
      parsedJSON.should.have.property('id');
      parsedJSON.should.not.have.property('exceptionId');
      done();
    });
  });

  it('invalid persistence type should throw error', function(done) {
    var id;

    var options2 = options;
    options2.headers['X-Relayer-Host'] = 'http://notAServer:8014';
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

  it('invalid retry parameter should throw error', function(done) {
    var id;
    options.headers['X-Relayer-Host'] = 'http://notAServer:8014';
    options.headers['X-Relayer-Retry'] = '5-7,4,8';

    utils.makeRequest(options, 'body request', function(err, res) {
      should.not.exist(err);
      var jsonRes = JSON.parse(res);
      jsonRes.should.have.property('exceptionId', 'SVC0002');
      jsonRes.should.have.property('exceptionText', 'Invalid parameter value: x-relayer-retry');
      jsonRes.should.have.property('userMessage', 'Invalid retry value: 5-7,4,8');

      done();
    });
  });

  it('invalid httpcallback should throw error', function(done) {
    var id;
    options.headers['X-Relayer-Host'] = 'http://notAServer:8014';
    options.headers['X-Relayer-httpcallback'] = 'http://';

    utils.makeRequest(options, 'body request', function(err, res) {
      should.not.exist(err);
      var jsonRes = JSON.parse(res);
      jsonRes.should.have.property('exceptionId', 'SVC0002');
      jsonRes.should.have.property('exceptionText', 'Invalid parameter value: x-relayer-httpcallback');
      done();
    });
  });

  it('invalid httpcallback should throw error', function(done) {
    var id;
    options.headers['X-Relayer-Host'] = 'http://notAServer:8014';
    options.headers['X-Relayer-httpcallback'] = 'localhost:8000';

    utils.makeRequest(options, 'body request', function(err, res) {
      should.not.exist(err);
      var jsonRes = JSON.parse(res);
      jsonRes.should.have.property('exceptionId', 'SVC0002');
      jsonRes.should.have.property('exceptionText', 'Invalid parameter value: x-relayer-httpcallback');
      done();
    });
  });
});
