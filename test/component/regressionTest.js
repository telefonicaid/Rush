var chai = require('chai');
var superagent = require('superagent');
var config = require('./config.js');
var redis = require('redis');

var expect = chai.expect;
var listener = require('../../lib/listener.js');
var consumer = require('../../lib/consumer.js');

var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;

var REDIS_HOST = config.redisServer.host;
var REDIS_PORT = config.redisServer.port;

var URL_RUSH = 'http://' + HOST + ':' + PORT;
var ENDPOINT = config.externalEndpoint + ':' + config.externalEndpointPort;
var QUEUE = 'wrL:hpri'; //Task
var QUEUE2 = 'wrL:lpri'; //Task

// Verbose MODE
var vm = false;
// Time to wait to check the status of the task
var TIMEOUT = 1000;
var describeTimeout = 60000;

function _validScenario(data){

  var agent = superagent.agent();
  var rc = redis.createClient(REDIS_PORT, REDIS_HOST);
 // rc.flushall();

  it(data.name + ' /' + data.method + ' #FOW #CT', function(done){

    var method;
      switch(data.method){
        case 'DELETE':
          method = 'del';
          break;
        default:
          method = data.method.toLowerCase()
      }

    agent[method](URL_RUSH)
      .set('x-relayer-host', ENDPOINT)  //Always the same endpoint
      .set(data.headers)
		  .send(data.body)
      .end(function(err, res) {

        expect(err).to.not.exist;
        expect(res.statusCode).to.equal(201); //Status code 201
        expect(res.body).to.exist;
        expect(res.body.id).to.exist;
			  if (vm) {console.log(res.body.id);}
        var transId = res.body.id;
        rc.lpop(QUEUE, function(err, res){
          expect(err).to.not.exist;
          var task = JSON.parse(res);
	        if (vm) {console.log(' Redis task: \n ',task);}
	        expect(task.id).to.equal(transId);
          expect(task).to.have.property('headers');

          for(var i = 0; i < data.not_expected.length; i++){
            expect(task.headers).to.not.have.property(data.not_expected[i]);
          }

          done();
        });
      });
  });
}

describe('Component Test: Regression ', function() {
  this.timeout(describeTimeout);

  before(function (done) {
    listener.start(done);
  });

  after(function (done) {
    listener.stop(done);
  });


  describe('Retrieved request should not store the empty parameters sent in the header policy', function () {

    var dataSetGET = [
      {method: 'GET', headers: {'x-relayer-persistence':''}, not_expected : ['x-relayer-persistence'], body: {}, name : 'Case 1 Should not contain x-relayer-persistence'},
      {method: 'GET', headers: {'x-relayer-protocol':''}, not_expected : ['x-relayer-protocol'], body: {}, name : 'Case 2 Should not contain x-relayer-protocol'},
      {method: 'GET', headers: {'x-relayer-httpcallback' : ''}, not_expected : ['x-relayer-httpcallback'], body: {}, name : 'Case 3 Should not contain x-relayer-httpcallback'},
      {method: 'GET', headers: {'x-relayer-topic' : ''}, not_expected : ['x-relayer-topic'], body: {}, name : 'Case 4 Should not contain x-relayer-topic'},
      {method: 'GET', headers: {'x-relayer-retry' : ''}, not_expected : ['x-relayer-retry'], body: {}, name : 'Case 5 Should not contain x-relayer-retry'},
		    ];

    for(i=0; i < dataSetGET.length; i++){
      _validScenario(dataSetGET[i]);  //Launch every test in data set
    }
  });

	describe('Retrieved request should not store the empty parameters sent in the header policy', function () {

		var dataSetPOST = [
			{method: 'POST', headers: {'x-relayer-persistence':''}, not_expected : ['x-relayer-persistence'], body: {}, name : 'Case 1 Should not contain x-relayer-persistence'},
			{method: 'POST', headers: {'x-relayer-protocol':''}, not_expected : ['x-relayer-protocol'], body: {}, name : 'Case 2 Should not contain x-relayer-protocol'},
			{method: 'POST', headers: {'x-relayer-httpcallback' : ''}, not_expected : ['x-relayer-httpcallback'], body: {}, name : 'Case 3 Should not contain x-relayer-httpcallback'},
			{method: 'POST', headers: {'x-relayer-topic' : ''}, not_expected : ['x-relayer-topic'], body: {}, name : 'Case 4 Should not contain x-relayer-topic'},
			{method: 'POST', headers: {'x-relayer-retry' : ''}, not_expected : ['x-relayer-retry'], body: {}, name : 'Case 5 Should not contain x-relayer-retry'},
		];

		for(i=0; i < dataSetPOST.length; i++){
			_validScenario(dataSetPOST[i]);  //Launch every test in data set
		}
	});

	describe('Retrieved request should not store the empty parameters sent in the header policy', function () {

		var dataSetPUT = [
			{method: 'PUT', headers: {'x-relayer-persistence':''}, not_expected : ['x-relayer-persistence'], body: {}, name : 'Case 1 Should not contain x-relayer-persistence'},
			{method: 'PUT', headers: {'x-relayer-protocol':''}, not_expected : ['x-relayer-protocol'], body: {}, name : 'Case 2 Should not contain x-relayer-protocol'},
			{method: 'PUT', headers: {'x-relayer-httpcallback' : ''}, not_expected : ['x-relayer-httpcallback'], body: {}, name : 'Case 3 Should not contain x-relayer-httpcallback'},
			{method: 'PUT', headers: {'x-relayer-topic' : ''}, not_expected : ['x-relayer-topic'], body: {}, name : 'Case 4 Should not contain x-relayer-topic'},
			{method: 'PUT', headers: {'x-relayer-retry' : ''}, not_expected : ['x-relayer-retry'], body: {}, name : 'Case 5 Should not contain x-relayer-retry'},
		];

		for(i=0; i < dataSetPUT.length; i++){
			_validScenario(dataSetPUT[i]);  //Launch every test in data set
		}
	});


});
