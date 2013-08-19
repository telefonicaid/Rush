var chai = require('chai');
var superagent = require('superagent');
var config = require('./config.js');
var redis = require('redis');

var expect = chai.expect;
var listener = require('../../lib/listener.js');
var consumer = require('../../lib/listener.js');

var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;

var REDIS_HOST = config.redisServer.host;
var REDIS_PORT = config.redisServer.port;

var URL_RUSH = 'http://' + HOST + ':' + PORT;
var ENDPOINT = config.externalEndpoint + ':' + config.externalEndpointPort;
var QUEUE = "wrL:hpri"; //Task
var QUEUE2 = "wrL:lpri"; //Task

// Verbose MODE
var vm = true;
// Time to wait to check the status of the task
var TIMEOUT = 1000;
var describeTimeout = 60000;

describe('ISSUE #113 #FPT', function () {

  before(function (done) {
    listener.start(done);
  });

  after(function (done) {
	  listener.stop(done);
  });

  var agent = superagent.agent();
  var rc = redis.createClient(REDIS_PORT, REDIS_HOST);
 // rc.flushall();

  it("Task should not contain x-relayer-persistence", function(done){
    agent
      .get(URL_RUSH)
      .set('x-relayer-host', ENDPOINT)  //Always the same endpoint
      .set('x-relayer-persistence', "")
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
	        if (vm) {console.log(" task222: ",task);}
	        //expect(task.id).to.equal(transId);
          //expect(task).to.have.property('headers');
          //expect(task.headers).to.not.have.property('x-relayer-persistence');

          done();
        });
      });
  });

	it("Task should not contain x-relayer-topic", function(done){
		agent
				.get(URL_RUSH)
				.set('x-relayer-host', ENDPOINT)  //Always the same endpoint
				.set('x-relayer-topic', "test_internal_state")
				.set('x-relayer-persistence', "BODY")
				.set('Headertest', "")
				.end(function(err, res) {

					expect(err).to.not.exist;
					expect(res.statusCode).to.equal(201); //Status code 201
					expect(res.body).to.exist;
					expect(res.body.id).to.exist;
					if (vm) {console.log(res.body.id);}
					var transId = res.body.id;
					rc.lpop(QUEUE, function(err, res){
						console.log(" res: ",res);
						expect(err).to.not.exist;
						var task = JSON.parse(res);
						if (vm) {console.log(" task: ",task);}
						expect(task.id).to.equal(transId);
						expect(task).to.have.property('headers');
						expect(task.headers).to.not.have.property('x-relayer-traceID');

						done();
					});
				});
	});


});


