var http = require('http');
var should = require('should');
var config = require('./config.js');
var utils = require('./utils.js');

var consumer = require('../../lib/consumer.js');
var listener = require('../../lib/listener.js');

var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;

var serversToShutDown = [];

function runTest(retryTimes, petitionCorrect, serverTimes, done) {
  'use strict';

  var CONTENT = 'Retry Test',
      APPLICATION_CONTENT = 'application/json',
      RELAYER_HOST =  config.simpleServerHostname + ':' + config.simpleServerPort,
      PERSONAL_HEADER_1_NAME = 'personal-header-1',
      PERSONAL_HEADER_1_VALUE = 'TEST1',
      PERSONAL_HEADER_2_NAME = 'personal-header-2',
      PERSONAL_HEADER_2_VALUE = 'TEST2',
      petitionsReceived = 0,
      srv;

  function makeRequest(retryTimes) {

    //Petition method
    var options = {};
    options.host = HOST;
    options.port = PORT;
    options.method = 'POST';
    options.headers = {};
    options.headers['content-type'] = APPLICATION_CONTENT;
    options.headers['X-Relayer-Host'] = RELAYER_HOST;
    options.headers['X-relayer-retry'] = retryTimes;
    options.headers[PERSONAL_HEADER_1_NAME] = PERSONAL_HEADER_1_VALUE;
    options.headers[PERSONAL_HEADER_2_NAME] = PERSONAL_HEADER_2_VALUE;

    utils.makeRequest(options, CONTENT, function(e, data) {
    });
  }

  srv = http.createServer(function(req, res) {

    var headers = req.headers,
        method = req.method,
        contentReceived = '';

    req.on('data', function(chunk) {
      contentReceived += chunk;
    });

    req.on('end', function() {

      petitionsReceived += 1;

      if (petitionsReceived === petitionCorrect) {
        res.writeHead(200, headers);
      } else {
        res.writeHead(500, headers);
      }

      res.end(contentReceived);
      req.destroy();

      //Test petition
      method.should.be.equal('POST');
      headers['content-type'].should.be.equal(APPLICATION_CONTENT);
      contentReceived.should.be.equal(CONTENT);

      if (petitionsReceived === serverTimes) {
        srv.close();
        done();
      }
    });
  }).listen(config.simpleServerPort, makeRequest.bind({}, retryTimes));

  serversToShutDown.push(srv);
}

describe('Single Feature: Retry #FRT', function() {
  'use strict';

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

  afterEach(function() {
    for (var i = 0; i < serversToShutDown.length; i++) {
      try {
        serversToShutDown[i].close();
      } catch (e) {

      }
    }

    serversToShutDown = [];
  });

  it('Case 1 The last retry will work #FRT', function(done) {

    this.timeout(15000);

    var retryTimes = 3,
        petitionCorrect = retryTimes + 1,
        serverTimes = retryTimes + 1;     //Three retries + the initial request

    runTest(retryTimes, petitionCorrect, serverTimes, done);
  });

  it('Case 2 The second retry will work #FRT', function(done) {

    this.timeout(15000);

    var retryTimes = 3,
        petitionCorrect = retryTimes,
        serverTimes = retryTimes;       //Two retries + the initial request

    runTest(retryTimes, petitionCorrect, serverTimes, done);
  });

  it('Case 3 None retry will work #FRT', function(done) {

    this.timeout(15000);

    var retryTimes = 3,
        petitionCorrect = retryTimes + 2,
        serverTimes = retryTimes + 1;     //Three retries + the initial request
                                          //Server won't be called again even if the last retry fails

    runTest(retryTimes, petitionCorrect, serverTimes, done);
  });
});
