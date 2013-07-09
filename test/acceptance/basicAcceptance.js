var should = require('should');
var superagent = require('superagent');
var config = require('./config');
var chai = require('chai');
var expect = chai.expect;
var _ = require('underscore');
var async = require('async');

var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;
var RUSHENDPOINT = 'http://' + HOST + ':' + PORT;
var ENDPOINT = config.externalEndpoint;
if (!ENDPOINT){
	ENDPOINT = 'http://www.google.es';
}
// Verbose MODE
var vm = false;
// Time to wait to check the status of the task
var TIMEOUT = 600;
var CREATED = 200; // 201 for UNICA
var describeTimeout = 60000;


function _validScenario(data, i){
		it(data.name, function(done){

			_.extend(data.headers, {"x-relayer-persistence" : "BODY"});
			var agent = superagent.agent();
			agent
					[data.method.toLowerCase()](RUSHENDPOINT )
					.set('x-relayer-host', ENDPOINT)  //Always the same endpoint
					.set('x-relayer-persistance','HEADER')  //Always the same endpoint
					.set(data.headers)
					.end(function(err, res) {
						expect(err).to.not.exist;
						expect(res.statusCode).to.equal(CREATED); //Status code 200
						expect(res.body).to.exist;
						expect(res.body.id).to.exist;
						res.text.should.not.include('exception');
						if (vm) {console.log(res.body.id);}
						var transId = res.body.id;
						setTimeout(function () {
							agent
									.get(RUSHENDPOINT +'/response/' + res.body['id'])
									.end(function onResponse2(err2, res2) {
										res2.headers['content-type'].should.eql('application/json; charset=utf-8');
										expect(res.statusCode).to.equal(200);
										res2.text.should.include('id');
										//res2.text.should.not.include('exception');
										if (data.headers['x-relayer-topic']) {
											res2.body['topic'].should.eql('TEST');
										}
										else{
											res2.body['topic'].should.eql('undefined');
										}
										if (vm) {
											console.log(i+1);
											console.log(res2.body);
										}
										done();
									});
						}, TIMEOUT);
					});
		});
}


function _invalidScenario(data, i) {
	async.series([
		function() {
		it(data.name, function (done) {
			var agent = superagent.agent();
			agent
					[data.method.toLowerCase()](RUSHENDPOINT)
					.set('x-relayer-host', ENDPOINT)  //Always the same endpoint
					.set(data.headers)
					.end(function (err, res) {
						should.not.exist(err);
						res.should.have.status(400);
						res.text.should.not.include("ok");
						should.exist(res.body['exceptionId']);

						if (data.headers['x-relayer-persistence']) {  //checks for invalid persistance
							res.body['exceptionId'].should.eql('SVC0003');
							res.body['exceptionText'].should.eql('Invalid parameter value: x-relayer-persistence. Possible values are: BODY, STATUS, HEADER');
						}
						else {
							res.body['exceptionId'].should.eql('SVC0002');
							res.body['exceptionText'].should.exist;
							if (data.headers['x-relayer-httpcallback']) {  //checks for invalid callback
								res.body['exceptionText'].should.eql('Invalid parameter value: x-relayer-httpcallback');
							}
							if (data.headers['x-relayer-httpcallback-error']) {  //checks for invalid callback
								res.body['exceptionText'].should.eql('Invalid parameter value: x-relayer-httpcallback-error');
							}
							if (data.headers['x-relayer-retry']) {  //checks for invalid retry
								res.body['exceptionText'].should.eql('Invalid parameter value: x-relayer-retry');
							}
							if (data.headers['x-relayer-proxy']) {  //checks for invalid proxy
								res.body['exceptionText'].should.eql('Invalid parameter value: x-relayer-proxy');
								console.log("\n+++++Issue Resolved++++++++\n");
							}
							if (data.headers['x-relayer-topic']) {  //checks for invalid topic
								res.body['exceptionText'].should.eql('Invalid parameter value: x-relayer-topic'); // It is possible to have a invalid topic?
							}
							if (data.headers['x-relayer-encoding']) {  //checks for invalid encoding
								res.body['exceptionText'].should.eql('Invalid parameter value: x-relayer-encoding');
								console.log("\n+++++Issue Resolved++++++++\n");
							}
						}


						if (vm) {
							console.log(res.body);
						}
						done();
					});
			});
		}]);
}



describe('Scenario: Basic acceptance tests for Rush as a Service ', function () {
	if (vm) {
		console.log('Endpoint to check deployment' , RUSHENDPOINT);
		console.log('Target Endpoint' , ENDPOINT);
	}
	var ids = [];


	describe('/ADD http requests ', function () {
		this.timeout(5000);
		describe('with a valid Endpoint and Headers', function () {
			var agent = superagent.agent();

			it('should accept requests using / POST', function (done) {
				agent
						.post(RUSHENDPOINT)
						.set('X-relayer-host', ENDPOINT)
						.send({})
						.end(onResponse);

				function onResponse(err, res) {
					//console.log(agent);
					should.not.exist(err);
					res.headers['x-powered-by'].should.eql('Express');
					res.headers['content-type'].should.eql('application/json; charset=utf-8');
					ids.push(res.body['id']);
					res.should.have.status(CREATED);
					res.text.should.include('id');
					return done();
				}
			});

			it('should accept requests using / GET', function (done) {
				agent
						.get(RUSHENDPOINT )
						.set('X-relayer-host', ENDPOINT)
						.send({})
						.end(onResponse);

				function onResponse(err, res) {
					//console.log(agent);
					should.not.exist(err);
					res.headers['x-powered-by'].should.eql('Express');
					res.headers['content-type'].should.eql('application/json; charset=utf-8');
					ids.push(res.body['id']);
					res.should.have.status(CREATED);
					res.text.should.include('id');
					return done();
				}
			});

			it('should accept requests using / PUT', function (done) {
				agent
						.put(RUSHENDPOINT)
						.set('X-relayer-host', ENDPOINT)
						.send({})
						.end(onResponse);

				function onResponse(err, res) {
					//console.log(agent);
					should.not.exist(err);
					res.headers['x-powered-by'].should.eql('Express');
					res.headers['content-type'].should.eql('application/json; charset=utf-8');
					ids.push(res.body['id']);
					res.should.have.status(CREATED);
					res.text.should.include('id');
					return done();
				}
			});

			it('should accept requests using / OPTIONS', function (done) {
				agent
						.options(RUSHENDPOINT)
						.set('X-relayer-host', ENDPOINT)
						.send({})
						.end(onResponse);

				function onResponse(err, res) {
					//console.log(agent);
					should.not.exist(err);
					res.headers['x-powered-by'].should.eql('Express');
					res.headers['content-type'].should.eql('application/json; charset=utf-8');
					ids.push(res.body['id']);
					res.should.have.status(CREATED);
					res.text.should.include('id');
					return done();
				}
			});

			it('should accept requests using / TRACE', function (done) {
				agent
						.trace(RUSHENDPOINT)
						.set('X-relayer-host', ENDPOINT)
						.send({})
						.end(onResponse);

				function onResponse(err, res) {
					//console.log(agent);
					should.not.exist(err);
					res.headers['x-powered-by'].should.eql('Express');
					res.headers['content-type'].should.eql('application/json; charset=utf-8');
					ids.push(res.body['id']);
					//console.log(res.body['id']);
					res.should.have.status(CREATED);
					res.text.should.include('id');
					return done();
				}
			});

			it('should NOT accept requests using / HEAD', function (done) {
				agent
						.head(RUSHENDPOINT)
						.set('X-relayer-host', ENDPOINT)
						.end(onResponse);

				function onResponse(err, res) {
					//console.log(agent);
					should.not.exist(err);
					res.headers['x-powered-by'].should.eql('Express');
					res.headers['content-type'].should.eql('application/json; charset=utf-8');
					ids.push(res.body['id']);
					res.should.have.status(CREATED);
					res.text.should.not.include('id');
					return done();
				}
			});

		});

	});


	describe('/Retrieve processed requests', function () {
		this.timeout(10000);
		describe('with valid Endpoint and parameters', function () {
			var agent = superagent.agent();

			it('should return the completed task using / POST', function (done) {
				agent
						.post(RUSHENDPOINT)
						.set('X-relayer-host', ENDPOINT)
						.set('X-relayer-persistence', 'BODY')
						.send({})
						.end(onResponse);

				function onResponse(err, res) {
					should.not.exist(err);
					ids.push(res.body['id']);
					res.headers['x-powered-by'].should.eql('Express');
					res.headers['content-type'].should.eql('application/json; charset=utf-8');
					res.should.have.status(CREATED);
					res.text.should.include('id');
					//console.log(res.body['id']);
					setTimeout(function () {
						agent
								.get(RUSHENDPOINT +'/response/' + ids[0])
								.end(
								function onResponse2(err2, res2) {
									//console.log("***CHECK POINT***",res2.body['id'])
									res2.headers['content-type'].should.eql('application/json; charset=utf-8');
									res2.should.have.status(200);
									res2.text.should.include('id');
									res2.body['topic'].should.eql('undefined');
									return done();
								});
					}, TIMEOUT);
				};

			});

			it('should return the completed task using / GET', function (done) {
				agent
						.get(RUSHENDPOINT)
						.set('X-relayer-host', ENDPOINT)
						.set('X-relayer-persistence', 'BODY')
						.send({})
						.end(onResponse);

				function onResponse(err, res) {
					//console.log(agent);
					should.not.exist(err);
					ids.push(res.body['id']);
					res.headers['x-powered-by'].should.eql('Express');
					res.headers['content-type'].should.eql('application/json; charset=utf-8');
					res.should.have.status(CREATED);
					res.text.should.include('id');
					//console.log(res.body['id']);
					setTimeout(function () {
						agent
								.get(RUSHENDPOINT +'/response/' + ids[0])
								.send({})
								.end(
								function onResponse2(err2, res2) {
									//console.log("***CHECK POINT***",res2.body['id'])
									res2.headers['content-type'].should.eql('application/json; charset=utf-8');
									res2.should.have.status(200);
									res2.text.should.include('id');
									res2.body['topic'].should.eql('undefined');
									return done();
								});
					}, TIMEOUT);
				};

			});

			it('should return the completed task using / PUT', function (done) {
				agent
						.put(RUSHENDPOINT)
						.set('X-relayer-host', ENDPOINT)
						.set('X-relayer-persistence', 'BODY')
						.send({})
						.end(onResponse);

				function onResponse(err, res) {
					//console.log(agent);
					should.not.exist(err);
					ids.push(res.body['id']);
					res.headers['x-powered-by'].should.eql('Express');
					res.headers['content-type'].should.eql('application/json; charset=utf-8');
					res.should.have.status(CREATED);
					res.text.should.include('id');
					//console.log(res.body['id']);
					setTimeout(function () {
						agent
								.get(RUSHENDPOINT +'/response/' + ids[0])
								.send({})
								.end(
								function onResponse2(err2, res2) {
									//console.log("***CHECK POINT***",res2.body['id'])
									res2.headers['content-type'].should.eql('application/json; charset=utf-8');
									res2.should.have.status(200);
									res2.text.should.include('id');
									res2.body['topic'].should.eql('undefined');
									return done();
								});

					}, TIMEOUT);
				};

			});

			it('should return the completed task using / OPTIONS', function (done) {
				agent
						.options(RUSHENDPOINT)
						.set('X-relayer-host', ENDPOINT)
						.set('X-relayer-persistence', 'BODY')
						.send({})
						.end(onResponse);

				function onResponse(err, res) {
					//console.log(agent);
					should.not.exist(err);
					ids.push(res.body['id']);
					res.headers['x-powered-by'].should.eql('Express');
					res.headers['content-type'].should.eql('application/json; charset=utf-8');
					res.should.have.status(CREATED);
					res.text.should.include('id');
					//console.log(res.body['id']);
					setTimeout(function () {
						agent
								.get(RUSHENDPOINT +'/response/' + ids[0])
								.send({})
								.end(
								function onResponse2(err2, res2) {
									//console.log("***CHECK POINT***",res2.body['id'])
									res2.headers['content-type'].should.eql('application/json; charset=utf-8');
									res2.should.have.status(200);
									res2.text.should.include('id');
									res2.body['topic'].should.eql('undefined');
									return done();
								});
					}, TIMEOUT);
				};

			});

		});

	});

});

describe('ACCEPTANCE TESTS: EXTERNAL VALID SCENARIOS [AWS]', function () {
	this.timeout(describeTimeout);


	describe('\nCheck single features: with a valid header policy request using method /GET', function () {



		var dataSetGET = [
			{method: 'GET', headers: {"x-relayer-persistence" : "HEADER"}, name : "Persistance HEADER: Should accept the request and retrieve stored header"},
			{method: 'GET', headers: {"x-relayer-persistence" : "STATUS"}, name : "Persistance HEADER: Should accept the request and retrieve stored status"},
			{method: 'GET', headers: {"x-relayer-persistence" : "BODY"}, name : "Persistance BODY: Should accept the request and retrieve the stored body"},
			{method: 'GET', headers: {"x-relayer-httpcallback" : "http://noname.com"}, name : "Callback: Should accept the request and retrieve the completed task"},
			{method: 'GET', headers: {"x-relayer-httpcallback-error" : "http://noname.com"},	name : "Error Callback: Should accept the request and retrieve the completed task"},
			{method: 'GET', headers: {"x-relayer-retry" : "10, 20, 30"}, name : "Retry: Should accept the request and retrieve the completed task"},
			{method: 'GET', headers: {'x-relayer-proxy' : 'http://proxy.com'}, name : "Proxy: Should accept the request and retrieve the completed task"},
			{method: 'GET', headers: {'x-relayer-encoding' : 'base64'}, name : "Encoding: Should accept the request and retrieve the completed task"},
			{method: 'GET', headers: {'x-relayer-topic' : 'TEST'}, name : "TOPIC: Should accept the request and retrieve the topic and the completed task"},
			{method: 'GET',  headers: {}, name : "Oneway No header: Should accept the request and retrieve the result"},
			{method: 'GET',  headers: {}, name : "Oneway No header: Should accept the request and retrieve the result"}
		];

		for(i=0; i < dataSetGET.length; i++){
			_validScenario(dataSetGET[i]);  //Launch every test in data set
		}
	});


	describe('\nCheck single features: with a valid header policy request using method /POST', function () {
		var dataSetPOST = [
			{method: 'POST', headers: {}, name : "Oneway No header: Should accept the request and retrieve the result"},
			{method: 'POST', headers: {"x-relayer-persistence" : "STATUS"}, name : "Persistance STATUS: Should accept the request and retrieve the stored status"},
			{method: 'POST', headers: {"x-relayer-persistence" : "HEADER"}, name : "Persistance HEADER: Should accept the request and retrieve stored header"},
			{method: 'POST', headers: {"x-relayer-persistence" : "BODY"}, name : "Persistance BODY: Should accept the request and retrieve the stored body"},
			{method: 'POST', headers: {"x-relayer-httpcallback" : "http://noname.com"}, name : "Callback: Should accept the request and retrieve the completed task"},
			{method: 'POST', headers: {"x-relayer-httpcallback-error" : "http://noname.com"},
				name : "Error Callback: Should accept the request and retrieve the completed task"},
			{method: 'POST', headers: {"x-relayer-retry" : "10, 20, 30"}, name : "Retry: Should accept the request and retrieve the completed task"},
			{method: 'POST', headers: {'x-relayer-proxy' : 'http://proxy.com'}, name : "Proxy: Should accept the request and retrieve the completed task"},
			{method: 'POST', headers: {'x-relayer-encoding' : 'base64'}, name : "Encoding: Should accept the request and retrieve the completed task"},
			{method: 'POST', headers: {'x-relayer-topic' : 'TEST'}, name : "TOPIC: Should accept the request and retrieve the topic and the completed task"}
		];

		for(i=0; i < dataSetPOST.length; i++){
			_validScenario(dataSetPOST[i]);  //Launch every test in data set
		}

	});

	describe('\nCheck single features: with a valid header policy request using method /PUT', function () {
		var dataSetPUT = [
			{method: 'PUT', headers: {}, name : "Oneway No header: Should accept the request and retrieve the result"},
			{method: 'PUT', headers: {"x-relayer-persistence" : "STATUS"}, name : "Persistance STATUS: Should accept the request and retrieve the stored status"},
			{method: 'PUT', headers: {"x-relayer-persistence" : "HEADER"}, name : "Persistance HEADER: Should accept the request and retrieve stored header"},
			{method: 'PUT', headers: {"x-relayer-persistence" : "BODY"}, name : "Persistance BODY: Should accept the request and retrieve the stored body"},
			{method: 'PUT', headers: {"x-relayer-httpcallback" : "http://noname.com"}, name : "Callback: Should accept the request and retrieve the completed task"},
			{method: 'PUT', headers: {"x-relayer-httpcallback-error" : "http://noname.com"},
				name : "Error Callback: Should accept the request and retrieve the completed task"},
			{method: 'PUT', headers: {"x-relayer-retry" : "10, 20, 30"}, name : "Retry: Should accept the request and retrieve the completed task"},
			{method: 'PUT', headers: {'x-relayer-proxy' : 'http://proxy.com'}, name : "Proxy: Should accept the request and retrieve the completed task"},
			{method: 'PUT', headers: {'x-relayer-encoding' : 'base64'}, name : "Encoding: Should accept the request and retrieve the completed task"},
			{method: 'PUT', headers: {'x-relayer-topic' : 'TEST'}, name : "TOPIC: Should accept the request and retrieve the topic and the completed task"}
		];


		for(i=0; i < dataSetPUT.length; i++){
			_validScenario(dataSetPUT[i]);  //Launch every test in data set
		}
	});

	describe('\nCheck single features: with a valid header policy request using method /DELETE', function () {
		var dataSetDEL = [
			{method: 'DEL', headers: {}, name : "Oneway No header: Should accept the request and retrieve the result"},
			{method: 'DEL', headers: {"x-relayer-persistence" : "STATUS"}, name : "Persistance STATUS: Should accept the request and retrieve the stored status"},
			{method: 'DEL', headers: {"x-relayer-persistence" : "HEADER"}, name : "Persistance HEADER: Should accept the request and retrieve stored header"},
			{method: 'DEL', headers: {"x-relayer-persistence" : "BODY"}, name : "Persistance BODY: Should accept the request and retrieve the stored body"},
			{method: 'DEL', headers: {"x-relayer-httpcallback" : "http://noname.com"}, name : "Callback: Should accept the request and retrieve the completed task"},
			{method: 'DEL', headers: {"x-relayer-httpcallback-error" : "http://noname.com"},
				name : "Error Callback: Should accept the request and retrieve the completed task"},
			{method: 'DEL', headers: {"x-relayer-retry" : "10, 20, 30"}, name : "Retry: Should accept the request and retrieve the completed task"},
			{method: 'DEL', headers: {'x-relayer-proxy' : 'http://proxy.com'}, name : "Proxy: Should accept the request and retrieve the completed task"},
			{method: 'DEL', headers: {'x-relayer-encoding' : 'base64'}, name : "Encoding: Should accept the request and retrieve the completed task"},
			{method: 'DEL', headers: {'x-relayer-topic' : 'TEST'}, name : "TOPIC: Should accept the request and retrieve the topic and the completed task"}
		];

		for(i=0; i < dataSetDEL.length; i++){
			_validScenario(dataSetDEL[i]);  //Launch every test in data set
		}
	});

	describe('\nCheck single features: with a valid header policy request using method /OPTIONS', function () {
		var dataSetOPTIONS = [
			{method: 'OPTIONS', headers: {}, name : "Oneway No header: Should accept the request and retrieve the result"},
			{method: 'OPTIONS', headers: {"x-relayer-persistence" : "STATUS"}, name : "Persistance STATUS: Should accept the request and retrieve the stored status"},
			{method: 'OPTIONS', headers: {"x-relayer-persistence" : "HEADER"}, name : "Persistance HEADER: Should accept the request and retrieve stored header"},
			{method: 'OPTIONS', headers: {"x-relayer-persistence" : "BODY"}, name : "Persistance BODY: Should accept the request and retrieve the stored body"},
			{method: 'OPTIONS', headers: {"x-relayer-httpcallback" : "http://noname.com"}, name : "Callback: Should accept the request and retrieve the completed task"},
			{method: 'OPTIONS', headers: {"x-relayer-httpcallback-error" : "http://noname.com"},
				name : "Error Callback: Should accept the request and retrieve the completed task"},
			{method: 'OPTIONS', headers: {"x-relayer-retry" : "10, 20, 30"}, name : "Retry: Should accept the request and retrieve the completed task"},
			{method: 'OPTIONS', headers: {'x-relayer-proxy' : 'http://proxy.com'}, name : "Proxy: Should accept the request and retrieve the completed task"},
			{method: 'OPTIONS', headers: {'x-relayer-encoding' : 'base64'}, name : "Encoding: Should accept the request and retrieve the completed task"},
			{method: 'OPTIONS', headers: {'x-relayer-topic' : 'TEST'}, name : "TOPIC: Should accept the request and retrieve the topic and the completed task"}
			//{method: 'OPTIONS', headers: {'x-relayer-topic' : 'TEST2'}, name : "TO DO: CHECK why the last test is not validated..."}
		];

		for(i=0; i < dataSetOPTIONS.length; i++){
			_validScenario(dataSetOPTIONS[i]);  //Launch every test in data set
		}
	});
});





describe.skip('ACCEPTANCE TESTS: EXTERNAL INVALID SCENARIOS (400) [AWS]', function () {
	this.timeout(5000);

describe('\nCheck single features: with a valid header policy request using method /GET', function () {
		var dataSetGET = [
			{method: 'GET', headers: {"x-relayer-persistence": "STATUSSS"}, name: "Persistance STATUS: Should NOT accept the request"},
			{method: 'GET', headers: {"x-relayer-persistence": "HEADERRR"}, name: "Persistance HEADER: Should NOT accept the request"},
			{method: 'GET', headers: {"x-relayer-persistence": "BODYY"}, name: "Persistance BODY: Should NOT accept the request"},
			{method: 'GET', headers: {"x-relayer-httpcallback": "httpSDD://noname.com"}, name: "Callback: Should NOT accept the request"},
			{method: 'GET', headers: {"x-relayer-httpcallback-error": "AAhttp://noname.com"},
				name: "Callback ERROR: Should NOT accept the request and retrieve the completed task"},
			{method: 'GET', headers: {"x-relayer-retry": "10, +, 30"}, name: "RETRY: Should NOT accept the request"},
			{method: 'GET', headers: {"x-relayer-retry": "10a, aa, 30"}, name: "RETRY: Should NOT accept the request"}
		];
		for (i = 0; i < dataSetGET.length; i++) {
			_invalidScenario(dataSetGET[i]);  //Launch every test in data set
		}
	});

});


/*

describe('\n POSSIBLE ISSUES', function () {
		var dataSetIssues = [
			// POSSIBLE ISSUES TO CHECK
			{method: 'GET', headers: {'x-relayer-proxy': 'aaa://\n'}, name: "Proxy: Should NOT accept the request"},
			{method: 'GET', headers: {'x-relayer-encoding': 'XXXIOSbase64'}, name: "Encoding: Should NOT accept the request"},
			{method: 'GET', headers: {'x-relayer-topic': '\n'}, name: "TOPIC: Should NOT accept the request"}
		];
		for (i = 0; i < dataSetIssues.length; i++) {
			_invalidScenario(dataSetIssues[i]);  //Launch every test in data set
		}
	});


describe('\n POSSIBLE ISSUES', function () {
			var agent = superagent.agent();

		it('ENCODING ISSUE #xxxx / Valid encoding UTF8', function (done) {
			agent
					.post(RUSHENDPOINT )
					.set('X-relayer-host', ENDPOINT)
					.set('X-relayer-persistence', 'BODY')
					.set('X-relayer-encoding', 'utf8')
					.send({})
					.end(onResponse);

			function onResponse(err, res) {
				//console.log(agent);
				should.not.exist(err);
				res.headers['x-powered-by'].should.eql('Express');
				res.headers['content-type'].should.eql('application/json; charset=utf-8');
				res.should.have.status(CREATED);
				res.text.should.include('id');
				setTimeout(function () {
					agent
							.get(RUSHENDPOINT + '/response/' + res.body['id'])
							.send({})
							.end(
							function onResponse2(err2, res2) {
								if (vm) {	console.log(res2.body);}
								res2.headers['content-type'].should.eql('application/json; charset=utf-8');
								res2.should.have.status(200);
								res2.text.should.include('id');
								res2.body['topic'].should.eql('undefined');
								res2.body['encoding'].should.eql('utf8');

							});
					return done();
				}, TIMEOUT);
			};

		});
		it('ENCODING ISSUE #xxxx / Invalid encoding ', function (done) {
				agent
						.get(RUSHENDPOINT )
						.set('X-relayer-host', ENDPOINT)
						.set('X-relayer-persistence', 'BODY')
						.set('X-relayer-encoding', 'FAKEutf8')
						.send({})
						.end(onResponse);

				function onResponse(err, res) {
					//console.log(agent);
					should.not.exist(err);
					res.headers['x-powered-by'].should.eql('Express');
					res.headers['content-type'].should.eql('application/json; charset=utf-8');
					res.should.have.status(400);
					res.body['exceptionText'].should.eql('Invalid parameter value: x-relayer-encoding');
					res.text.should.not.include('id');
					return done();
					};

			});

	it('TOPIC ISSUE #xxxx / Valid TOPIC ', function (done) {
		agent
				.get(RUSHENDPOINT )
				.set('X-relayer-host', ENDPOINT)
				.set('X-relayer-persistence', 'BODY')
				.set('X-relayer-topic', 'TEST_TOPIC')
				.send({})
				.end(onResponse);

		function onResponse(err, res) {
			//console.log(agent);
			should.not.exist(err);
			res.headers['x-powered-by'].should.eql('Express');
			res.headers['content-type'].should.eql('application/json; charset=utf-8');
			res.should.have.status(CREATED);
			res.text.should.include('id');
			setTimeout(function () {
				agent
						.get(RUSHENDPOINT + '/response/' + res.body['id'])
						.send({})
						.end(
						function onResponse2(err2, res2) {
							res2.headers['content-type'].should.eql('application/json; charset=utf-8');
							res2.should.have.status(200);
							res2.text.should.include('id');
							res2.body['topic'].should.eql('TEST_TOPIC');
						});
				return done();
			}, TIMEOUT);
		};
	});

	it('TOPIC ISSUE #xxxx / INVALID TOPIC ', function (done) {
		agent
				.get(RUSHENDPOINT )
				.set('X-relayer-host', ENDPOINT)
				.set('X-relayer-persistence', 'BODY')
				.set('X-relayer-topic', '\n\n\n\n*******')
				.send({})
				.end(onResponse);

		function onResponse(err, res) {
			//console.log(agent);
			should.not.exist(err);
			res.headers['x-powered-by'].should.eql('Express');
			res.headers['content-type'].should.eql('application/json; charset=utf-8');
			res.should.have.status(CREATED);
			res.text.should.include('id');
			if (vm) {	console.log(res.body);}
			setTimeout(function () {
				agent
						.get(RUSHENDPOINT + '/response/' + res.body['id'])
						.send({})
						.end(
						function onResponse2(err2, res2) {
							if (vm) {	console.log(res2.body);}
							res2.headers['content-type'].should.eql('application/json; charset=utf-8');
							res2.should.have.status(200);
							res2.text.should.include('id');
							res2.body['topic'].should.eql('\n\n\n\n*******');
						});
				return done();
			}, TIMEOUT);
		};



	});

});

		*/
