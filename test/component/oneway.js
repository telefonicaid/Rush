// https://pdihub.hi.inet/TDAF/tdaf-api-authserver/blob/feature/APIAUTHSVR-6/test/acceptance/component/grant-types/client-credentials/client-credentials
// DATASET


var should = require('should');
var chai = require('chai');
var superagent = require('superagent');
var config = require('./config.js');
var redis = require('redis');
var _ = require('underscore');

var expect = chai.expect;

var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;

var REDIS_HOST = config.redisServer.host;
var REDIS_PORT = config.redisServer.port;

var URL_RUSH = 'http://' + HOST + ':' + PORT;
var ENDPOINT = config.externalEndpoint;
var TIMEOUT = 1000;
var QUEUE = "wrL:hpri";

var ALL_HEADERS = [
  "x-relayer-persistence",
  "x-relayer-httpcallback",
  "x-relayer-httpcallback-error",
  "x-relayer-retry",
  "x-relayer-topic",
  "x-relayer-proxy",
  "x-relayer-encoding"
];

describe('TASK QUEUE', function () {
  var agent = superagent.agent();
  var rc = redis.createClient(REDIS_PORT, REDIS_HOST);
  rc.flushall();

  var dataSet = [
        {method: 'GET', headers: {}, name : "Scenario 1: Should return valid task with OneWay policy and GET method"},
        {method: 'GET', headers: {"x-relayer-persistence" : "STATUS"}, name : "Scenario 2: Should return valid task with OneWay policy and GET method"},
        {method: 'GET', headers: {"x-relayer-persistence" : "HEADER"}, name : "Scenario 3: Should return valid task with OneWay policy and GET method"},
        {method: 'GET', headers: {"x-relayer-persistence" : "BODY"}, name : "Scenario 4: Should return valid task with OneWay policy and GET method"},
        {method: 'POST', headers: {"x-relayer-httpcallback" : "http://noname.com"}, name : "Scenario 4: Should return valid task with OneWay policy and GET method"},
        {method: 'POST', headers: {"x-relayer-httpcallback" : "http://noname.com", "x-relayer-httpcallback-error" : "http://noname.com"}, name : "Scenario 4: Should return valid task with OneWay policy and GET method"},
        {method: 'POST', headers: {"x-relayer-retry" : "10, 20, 30"}, name : "Scenario 4: Should return valid task with OneWay policy and GET method"},
        {method: 'POST', headers: {"x-relayer-retry" : "10, 20, 30"}, name : "Scenario 4: Should return valid task with OneWay policy and GET method"}
      ];

  for(var i=0; i < dataSet.length; i++){
    _newScenario(dataSet[i])();  //Launch every test in data set
  }

  function _newScenario(data){
    return function(){
      it(data.name, function(done){
        agent
          [data.method.toLowerCase()](URL_RUSH)
          .set('x-relayer-host', ENDPOINT)  //Always the same endpoint
          .set(data.headers)
          .end(function(err, res) {
            expect(err).to.not.exist;
            expect(res.statusCode).to.equal(200); //Status code 200
            expect(res.body).to.exist;
            expect(res.body.ok).to.be.true;  //Ok and task id
            expect(res.body.id).to.exist;

            var transId = res.body.id;
            rc.lpop(QUEUE, function(err, res){
              expect(err).to.not.exist;

              var task = JSON.parse(res);
              expect(task.id).to.equal(transId);
              expect(task).to.have.property('headers');
              expect(task).to.have.property('method');
              expect(task.method).to.equal(data.method);
              expect(task.headers).to.have.property('x-relayer-host');
              expect(task.headers['x-relayer-host']).to.equal(ENDPOINT);

              for(var header in data.headers){    //every header in the request must be inside the current task
                var head = header.toLowerCase();
                expect(task.headers).to.have.property(head);
                expect(task.headers[head]).to.equal(data.headers[head]);
              }

              var shouldNotExist = _.difference(ALL_HEADERS, Object.keys(data.headers));
              for(var i=0; i < shouldNotExist.length; i++){
                expect(task.headers).to.not.have.property(shouldNotExist[i]);
              }
              done();
            });
          });
      });
    };
  }
});
