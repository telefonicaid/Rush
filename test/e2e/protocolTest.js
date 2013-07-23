var should = require('should');
var superagent = require('superagent');
var config = require('./config');
var chai = require('chai');
var expect = chai.expect;
var _ = require('underscore');
var async = require('async');
var server = require('./simpleServer.js');
var utils = require('./utils.js');

var consumer = require('../../lib/consumer.js');
var listener = require('../../lib/listener.js');

//RUSH ENDPOINT
var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;
var RUSHENDPOINT = 'http://' + HOST + ':' + PORT;

//Final host endpoint
var fhHOST = config.simpleServerHostname;
var fhPORT = config.simpleServerPort;

var ENDPOINT = config.externalEndpoint;
if (!ENDPOINT){
	//ENDPOINT = 'www.google.es';
	ENDPOINT = fhHOST + ':' + fhPORT;
}
// Verbose MODE
var vm = false;
// Time to wait to check the status of the task
var TIMEOUT = 100;
var CREATED = 201; // 200 for older versions
var describeTimeout = 60000;


function executeTest(method, body, done) {
	var id, options = {};
	var PATH = '/testPath/test1/test2/?var=a&var2=b';
	var TEST_HEADER_NAME = 'test-header', TEST_HEADER_VALUE = 'test header value';
	var traceID = 'a8450a60-ea01-11e2-bd82-3baee03998f0';

	options.host = HOST;
	options.port = PORT;
	options.method = method;
	options.path = PATH;
	options.headers = {};
	options.headers['content-type'] = 'application/json';
	options.headers['X-Relayer-Host'] =  config.simpleServerHostname + ':' + config.simpleServerPort;
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
					var options = { port: PORT, host: HOST, path: '/response/' + id, method: 'GET'};
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
				}, TIMEOUT);
			}
	);
	serversToShutDown.push(simpleServer);
}


function _validScenario(data){
	it(data.name, function(done){

		var agent = superagent.agent();
		agent
				[data.method.toLowerCase()](RUSHENDPOINT )
				.set('x-relayer-host', ENDPOINT)  //Always the same endpoint
				.set("x-relayer-persistence","BODY")
				.set(data.headers)
				.send(data.body)
				.end(function(err, res) {
					expect(err).to.not.exist;
					expect(res.statusCode).to.eql(CREATED);
					expect(res.body).to.exist;
					expect(res.body.id).to.exist;
					res.text.should.not.include('exception');
					if (vm) {console.log(res.body.id);}

					//Get the processed response
					setTimeout(function () {
						agent
								.get(RUSHENDPOINT +'/response/' + res.body['id'])
								.end(function onResponse2(err2, res2) {
									expect(err2).to.not.exist;
									expect(res2).to.exist;
									expect(res.statusCode).to.equal(CREATED);
									res2.headers['content-type'].should.eql('application/json; charset=utf-8');
									res2.text.should.include('id');
									res2.text.should.include('state');

									if (data.headers['X-Relayer-Traceid']) { //validate header TraceId
										res2.should.have.property('traceID', data.headers['x-relayer-traceID']);
									}
									if (data.headers['X-Relayer-xxx']) {     //validate header xxx
										res2.should.have.property('xxx', data.headers['xxx']);
									}



									if (vm) {
										console.log(res2.body);
									}
									done();
								});
					}, TIMEOUT);
				});
	});
}

function _validScenario1(data){
	var id, options = {};
}



var serversToShutDown = [];


describe('Feature: Protocol', function() {

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
			} catch (e) {}
		}
		serversToShutDown = [];
	});


	it('Should return the correct topic id / GET', function(done) {
		executeTest('GET', '', done);
	});


	describe('\nCheck single feature: accepting request with a valid header policy request using', function () {
		var dataSetPOST = [
			{method: 'GET', headers: {'X-Relayer-Protocol':'http'}, body: {}, name : "PROTOCOL: 1 Should accept the request using HTTP /GET"},
			{method: 'GET', headers: {'X-Relayer-Protocol':'https'}, body: {}, name : "PROTOCOL: 2 Should accept the request using HTTPS /GET"},
			{method: 'POST', headers: {'X-Relayer-Protocol':'http'}, body: {}, name : "PROTOCOL: 3 Should accept the request using HTTP /POST"},
			{method: 'POST', headers: {'X-Relayer-Protocol':'https'}, body: {}, name : "PROTOCOL: 4 Should accept the request using HTTPS /POST"},


		];

		for(i=0; i < dataSetPOST.length; i++){
			_validScenario(dataSetPOST[i]);  //Launch every test in data set
		}

	});

});
