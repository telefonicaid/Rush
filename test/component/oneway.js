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
var QUEUE = "wrL:hpri"; //Task

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
        {method: 'GET', headers: {}, name : "Case 1: Should return a valid task with OneWay policy and GET method"},
        {method: 'GET', headers: {"x-relayer-persistence" : "STATUS"}, name : "Case 2: Task should contain STATUS persistence"},
        {method: 'GET', headers: {"x-relayer-persistence" : "HEADER"}, name : "Case 3: Task should contain HEADER persistence"},
        {method: 'GET', headers: {"x-relayer-persistence" : "BODY"}, name : "Case 4: Task should contain BODY persistence"},
        {method: 'POST', headers: {"x-relayer-httpcallback" : "http://noname.com"}, name : "Case 5: Task should contain x-relayer-httpcallback atribute"},
        {method: 'POST', headers: {"x-relayer-httpcallback" : "http://noname.com", "x-relayer-httpcallback-error" : "http://noname.com"}, name : "Case 6: Task should contain x-relayer-httpcallback and x-relayer-httpcallback-error"},
        {method: 'POST', headers: {"x-relayer-retry" : "10, 20, 30"}, name : "Case 7: Task should have property x-relayer-retry"},
        {method: 'PUT', headers: {}, name : "Case 8: Task should be valid with PUT method"},
        {method: 'PUT', headers: {'x-relayer-topic' : 'TEST'}, name : "Case 9: Task should have property x-relayer-topic"},
        {method: 'PUT', headers: {'x-relayer-proxy' : 'http://proxy.com'}, name : "Case 10: Task should have property x-relayer-proxy"},
        {method: 'PUT', headers: {'x-relayer-topic' : 'TEST'}, name : "Case 11: Task should have property x-relayer-topic"}
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

              var shouldNotExist = _.difference(ALL_HEADERS, Object.keys(data.headers)); //headers that aren't in the request
              for(var i=0; i < shouldNotExist.length; i++){                              //there should not be headers in the task that are not in the request
                expect(task.headers).to.not.have.property(shouldNotExist[i]);
              }
              done();
            });
          });
      });
    };
  }
});
