var should = require('should');
var superagent = require('superagent');
var config = require('./config');
var chai = require('chai');
var expect = chai.expect;
var _ = require('underscore');
var async = require('async');
var server = require('./advancedServer.js');
var dbUtils = require('../dbUtils.js');


var fs = require('fs');
var os = require('os');
var util = require('util');
var processLauncher = require('../processLauncher');

var consumer = new processLauncher.consumerLauncher();
var listener = new processLauncher.listenerLauncher();

//RUSH ENDPOINT
var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;
var RUSHENDPOINT = 'http://' + HOST + ':' + PORT;

//Final host endpoint
var fhHOST = config.simpleServerHostname;
var fhPORT = config.simpleServerPort;

var log = 'Rush_' + os.hostname() + '.log';


var RELAYREQUEST = '| lvl=INFO | op=RELAY REQUEST | msg=Relay Request received | corr=N/A | trans=.* | hostname=.* | ' +
        'component=listener | userID=\'.*\' |',
    PERSISTENCE_QUEUED = '| lvl=INFO | op=PERSISTENCE | msg=Persistence Completed | corr=N/A | trans=.* | ' +
        'hostname=.* | component=evPersistence | userID=\'.*\' | state=\'queued\'',
    PERSISTENCE_PROCESSING = '| lvl=INFO | op=PERSISTENCE | msg=Persistence Completed | corr=N/A | trans=.* | ' +
        'hostname=.* | component=evPersistence | userID=\'.*\' | state=\'processing\'',
    PERSISTENCE_COMPLETED = '| lvl=INFO | op=PERSISTENCE | msg=Persistence Completed | corr=N/A | trans=.* | ' +
        'hostname=.* | component=evPersistence | userID=\'.*\' | state=\'completed\'',
    PERSISTENCE_ERROR = '| lvl=INFO | op=PERSISTENCE | msg=Persistence Completed | corr=N/A | trans=.* | hostname=.* ' +
        '| component=evPersistence | userID=\'.*\' | state=\'error\'',
    JOBENDED = '| lvl=INFO | op=CONSUME | msg=Job Ended | corr=N/A | trans=.* | hostname=.* | component=consumer | ' +
        'userID=\'.*\' |',
    NOHOST = '| lvl=WARN | op=ASSIGN REQUEST | msg=Request Error | corr=N/A | trans=.* | hostname=.* | ' +
        'component=listener | userID=\'.*\' | error=[{ type: \'invalid_parameter\',  parameter: \'x-relayer-host\',  ' +
        'userMessage: \'Valid format: host[:port]\' }]',
    INVALIDPERSISTENCE = '| lvl=WARN | op=ASSIGN REQUEST | msg=Request Error | corr=N/A | trans=.* | hostname=.* ' +
        '| component=listener | userID=\'.*\' | error=[{ type: \'invalid_parameter_accepted_values\',  ' +
        'parameter: \'x-relayer-persistence\',  acceptedValues: [ \'BODY\', \'STATUS\', \'HEADER\' ] }]',
    INVALID_CALLBACK_PROTO = '| lvl=WARN | op=ASSIGN REQUEST | msg=Request Error | corr=N/A | trans=.* ' +
        '| hostname=.* | component=listener | userID=\'.*\' | error=[{ type: \'invalid_parameter\',  ' +
        'parameter: \'x-relayer-httpcallback\',  userMessage: \'Protocol is not defined\' }]',
    INVALID_CALLBACK_HOST = '| lvl=WARN | op=ASSIGN REQUEST | msg=Request Error | corr=N/A | trans=.* | ' +
        'hostname=.* | component=listener | userID=\'.*\' | error=[{ type: \'invalid_parameter\',  parameter: ' +
        '\'x-relayer-httpcallback\',  userMessage: \'Hostname expected. Empty host after protocol\' }]',
    INVALID_RETRY = '| lvl=WARN | op=ASSIGN REQUEST | msg=Request Error | corr=N/A | trans=.* | hostname=.* ' +
        '| component=listener | userID=\'.*\' | error=[{ type: \'invalid_parameter\',  parameter: ' +
        '\'x-relayer-retry\',  userMessage: \'Invalid retry value: .*\' }]',
    INVALID_HEADER = '| lvl=WARN | op=ASSIGN REQUEST | msg=Request Error | corr=N/A | trans=.* | ' +
        'hostname=.* | component=listener | userID=\'.*\' | error=[{ type: \'invalid_parameter\',  ' +
        'parameter: \'x-relayer-header\',  userMessage: \'Value for header .* is not defined\' }]',
    JOBERROR = '| lvl=WARN | op=DO JOB | msg=Request Error | corr=N/A | trans=.* | hostname=.* | ' +
        'component=eventWorker | userID=\'.*\' | error={ [Error: getaddrinfo ENOTFOUND]  code: \'ENOTFOUND\',  ' +
        'errno: \'ENOTFOUND\',  syscall: \'getaddrinfo\',  resultOk: false }',
    CALLBACKERROR = '| lvl=WARN | op=HTTP CALLBACK | msg=Callback Error | corr=N/A | trans=.* | hostname=.* | ' +
        'component=evCallback | userID=\'.*\' | error={ callback_err: \'getaddrinfo ENOTFOUND\' }';

var escape = function(text) {
  'use strict';
  return text.replace(/[-[\]{}()+?,\\^$|#\s]/g, '\\$&');
};

ENDPOINT = fhHOST + ':' + fhPORT;

var serversToShutDown = [];

// Time to wait to check the status of the task
var TIMEOUT = 1000;
var CREATED = 201;
var describeTimeout = 5000;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; //Accept self signed certs

function _scenario(data){
  'use strict';

  it('Case ' + data.name +  ' #LOGS', function(done){
    var agent = superagent.agent();
    var id;

    var method;
    switch(data.method){
    case 'DELETE':
      method = 'del';
      break;
    default:
      method = data.method.toLowerCase();
    }
    var simpleServer = server({port : fhPORT, protocol : data.protocol}, {},
      function() {

        data.expected.push(RELAYREQUEST);
        var req = agent
            [method](RUSHENDPOINT + data.path )
            .set('x-relayer-host', ENDPOINT)  //Always the same endpoint
            .set('x-relayer-persistence','BODY')
            .set('content-type','application/json')
            .set(data.headers);

        if(data.method === 'POST' || data.method === 'PUT'){
          req = req.send(data.body);
        }
        req.end(function(){

          setTimeout(function() {

            var logResult = fs.readFileSync(log).toString();

            for(var i=0; i < data.expected.length; i++){
              var pattern=new RegExp(escape(data.expected[i]));
              var contains = pattern.test(logResult);

              contains.should.be.true;
            }

            done();

          }, TIMEOUT);
        });
      },
      function(dataReceived) {});
    serversToShutDown.push(simpleServer);
  });
}


describe('Multiple Feature: LOGs Checks '  + '#LOGS', function() {
  'use strict';
  this.timeout(describeTimeout);

  var fdLLog, fdCLog;

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

  beforeEach(function (done){
    fdLLog = fs.openSync(log, 'w+');
    dbUtils.cleanDb(done);
  });

  afterEach(function() {
    fs.closeSync(fdLLog);

    for (var i = 0; i < serversToShutDown.length; i++) {
      try {
        serversToShutDown[i].close();
      } catch (e) {}
    }
    serversToShutDown = [];
  });

  describe(' ', function () {

    var dataSetPOST = [
      {protocol : 'http', method: 'GET', path: '/',
        expected : [PERSISTENCE_QUEUED, PERSISTENCE_PROCESSING, PERSISTENCE_COMPLETED, JOBENDED], headers: {}, body: {},
        name : "1 Should log GET Relay request, persistence, and job"},
      {protocol : 'http', method: 'POST', path: '/',
        expected : [PERSISTENCE_QUEUED, PERSISTENCE_PROCESSING, PERSISTENCE_COMPLETED, JOBENDED], headers: {}, body: {},
        name : "2 Should log POST Relay request, persistence, and job"},
      {protocol : 'http', method: 'PUT', path: '/',
        expected : [PERSISTENCE_QUEUED, PERSISTENCE_PROCESSING, PERSISTENCE_COMPLETED, JOBENDED], headers: {}, body: {},
        name : "3 Should log PUT Relay request, persistence, and job"},
      {protocol : 'https', method: 'GET', path: '/',
        expected : [PERSISTENCE_QUEUED, PERSISTENCE_PROCESSING, PERSISTENCE_COMPLETED, JOBENDED],
        headers: {'X-Relayer-Protocol':'https'}, body: {},
        name : "4 HTTPS: Should log GET Relay request, persistence, and job"},
      {protocol : 'https', method: 'POST', path: '/',
        expected : [PERSISTENCE_QUEUED, PERSISTENCE_PROCESSING, PERSISTENCE_COMPLETED, JOBENDED],
        headers: {'X-Relayer-Protocol':'https'}, body: {},
        name : "5 HTTPS: Should log POST Relay request, persistence, and job"},
      {protocol : 'https', method: 'PUT', path: '/',
        expected : [PERSISTENCE_QUEUED, PERSISTENCE_PROCESSING, PERSISTENCE_COMPLETED, JOBENDED],
        headers: {'X-Relayer-Protocol':'https'}, body: {},
        name : "6 HTTPS: Should log PUT Relay request, persistence, and job"},
      {protocol : 'http', method: 'GET', path: '/',
        expected : [NOHOST], headers: {'x-relayer-host' : 'http://invalid'}, body: {},
        name : "7 Should log x-relayer-host error"},
      {protocol : 'http', method: 'GET', path: '/',
        expected : [INVALIDPERSISTENCE], headers: {'x-relayer-persistence' : 'INVALID'}, body: {},
        name : "8 Should log Invalid Persistence Error"},
      {protocol : 'http', method: 'GET', path: '/',
        expected : [INVALID_CALLBACK_PROTO], headers: {'x-relayer-httpcallback' : 'INVALID'}, body: {},
        name : "9 Should log Invalid x-relayer-httpcallback protocol"},
      {protocol : 'http', method: 'GET', path: '/',
        expected : [INVALID_CALLBACK_HOST], headers: {'x-relayer-httpcallback' : 'http://'}, body: {},
        name : "10 Should log Invalid x-relayer-httpcallback hostname"},
      {protocol : 'http', method: 'GET', path: '/',
        expected : [INVALID_RETRY], headers: {'x-relayer-retry' : 'INVALID'}, body: {},
        name : "11 Should log Invalid x-relayer-retry hostname"},
      {protocol : 'http', method: 'GET', path: '/',
        expected : [INVALID_HEADER], headers: {'x-relayer-header' : "INVALID" }, body: {},
        name : "12 Should log Invalid header"},
      {protocol : 'http', method: 'GET', path: '/',
        expected : [PERSISTENCE_QUEUED, PERSISTENCE_PROCESSING, PERSISTENCE_ERROR, JOBERROR],
        headers: {'x-relayer-host' : "google.esssss" }, body: {},
        name : "13 Should log ENOTFOUND"},
      {protocol : 'http', method: 'GET', path: '/',
        expected : [PERSISTENCE_QUEUED, PERSISTENCE_PROCESSING, PERSISTENCE_COMPLETED, CALLBACKERROR],
        headers: {'x-relayer-httpcallback' : "http://google.esssss" }, body: {},
        name : "14 Should log Callback ENOTFOUND"}
    ];

    for(var i=0; i < dataSetPOST.length; i++){
      _scenario(dataSetPOST[i]);  //Launch every test in data set
    }
  });

});

//TODO: path different to empty
