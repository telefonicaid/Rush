var async = require('async');
var should = require('should');
var config = require('./config.js');
var server = require('./simpleServer.js');
var utils = require('./utils.js');
var redis = require('redis');
var dbUtils = require('../dbUtils.js');


var consumer = require('../consumerLauncher.js');
var listener = require('../listenerLauncher.js');

var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;

var SIMPLESERVERPORT = 4002;

var serversToShutDown = [];

function executeTest(method, body, done) {
  'use strict';

  var id, options = {};
  var PATH = '/testPath/test1/test2/?var=a&var2=b',
      TEST_HEADER_NAME = 'test-header', TEST_HEADER_VALUE = 'test header value',
      traceID = 'a8450a60-ea01-11e2-bd82-3baee03998f0';

  options.host = HOST;
  options.port = PORT;
  options.method = method;
  options.path = PATH;
  options.headers = {};
  options.headers['content-type'] = 'application/json';
  options.headers['X-Relayer-Host'] =  config.simpleServerHostname + ':' + SIMPLESERVERPORT;
  options.headers['X-relayer-persistence'] = 'BODY';
  options.headers[TEST_HEADER_NAME] = TEST_HEADER_VALUE;
  options.headers['X-Relayer-traceid'] = traceID;

  var simpleServer = server.serverListener(

      function() {
        utils.makeRequest(options, body, function(err, res) {
          id = JSON.parse(res).id;
          //console.log(id);
        });
      },

      function(methodReceived, headersReceived, url, bodyReceived) {
        methodReceived.should.be.equal(method);
        url.should.be.equal(PATH);
        headersReceived.should.have.property(TEST_HEADER_NAME, TEST_HEADER_VALUE);

        var checked = false;
        var interval = setInterval(function() {
          var options = { port: PORT, host: HOST,
            path: '/response/' + id, method: 'GET'};
          options.headers = { 'X-Relayer-Traceid' : traceID };

          function checkResponse(err, data, res) {

            var JSONres = JSON.parse(data);

            if (!checked && res.statusCode !== 404 && JSONres.state === 'completed') {

              clearInterval(interval);

              JSONres.body.should.be.equal(body);
              JSONres.headers.should.have.property(TEST_HEADER_NAME, TEST_HEADER_VALUE);
              JSONres.should.have.property('traceID', traceID);

              checked = true;
              done();
            }
          }
          utils.makeRequest(options, '', checkResponse);
        }, 200);
      }, SIMPLESERVERPORT
  );
  serversToShutDown.push(simpleServer);
}

describe('Single Feature: TraceID #FTID', function() {
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
    dbUtils.exit();
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

  beforeEach(function(){
    dbUtils.cleanDb();
  });


  it('Case 1 Should return  the correct Traceid / GET #FTID', function(done) {
    executeTest('GET', '', done);
  });


  it('Case 2 Should return  the correct TraceId / POST #FTID', function(done) {
    executeTest('POST', 'TEST BODY 1', done);

  });

  it('Case 3 Should return  the correct TraceId / PUT #FTID', function(done) {
    executeTest('PUT', 'TEST BODY 2', done);
  });

  it('Case 4 Should return  the invalid Traceid / GET #FTID', function(done) {
    executeTest('GET', '', done);
  });


  it('Case 5 Should return  the invalid TraceId / POST #FTID', function(done) {
    executeTest('POST', 'TEST BODY 1?=)(/&%$·\'', done);

  });

  it('Case 6 Should return  the invalid TraceId / PUT #FTID', function(done) {
    executeTest('PUT', 'TEST BODY 2 |||@#|@~@½@#', done);
  });

  describe('TraceID: Rush should accept requests sending TraceID and recover it when task are retrieved', function () {
    var dataSet = [
      {method: 'GET', path: '', headers: {'X-Relayer-Encoding':'UTF-8'}, body: {},
        name : ' 1 Should accept the request with a real protocol UTF-8 /GET #FTID'},
      {method: 'GET', path: '', headers: {'X-Relayer-Encoding':'UTF8'}, body: {},
        name : ' 2 Should accept the request with a real protocol UTF8 /GET #FTID'},
      {method: 'GET', path: '', headers: {'X-Relayer-Encoding':'utf8'}, body: {},
        name : ' 3 Should accept the request with a real protocol utf8 /GET #FTID'},
      {method: 'GET', path: '', headers: {'X-Relayer-Encoding':'QUOTED-PRINTABLE'}, body: {},
        name : ' 4 Should accept the request with a real protocol QUOTED-PRINTABLE /GET #FTID'},
      {method: 'GET', path: '', headers: {'X-Relayer-Encoding':'8BIT'}, body: {},
        name : ' 5 Should accept the request with a real protocol 8BIT /GET #FTID'},
      {method: 'GET', path: '', headers: {'X-Relayer-Encoding':'7BIT'}, body: {},
        name : ' 6 Should accept the request with a real protocol 7BIT /GET #FTID'},
      {method: 'GET', path: '', headers: {'X-Relayer-Encoding':'BINARY'}, body: {},
        name : ' 7 Should accept the request with a real protocol BINARY /GET #FTID'},
      {method: 'GET', path: '', headers: {'X-Relayer-Encoding':'x'}, body: {},
        name : ' 8 Should accept the request using a fake encoding  \'x\' /GET #FTID'}
    ];

    for(var i=0; i < dataSet.length; i++){
      //_invalidScenario(dataSet[i]);  //Launch every test in data set
    }
  });

});
