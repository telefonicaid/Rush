var should = require('should');
var superagent = require('superagent');
var config = require('./config');
var chai = require('chai');
var expect = chai.expect;
var _ = require('underscore');
var async = require('async');
var server = require('./advancedServer.js');
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

ENDPOINT = fhHOST + ':' + fhPORT;

var serversToShutDown = [];

// Verbose MODE
var vm = true;
// Time to wait to check the status of the task
var TIMEOUT = 1000;
var CREATED = 201;
var describeTimeout = 6000;

function _validScenario(data){
	var agent = superagent.agent();
	it(data.name, function(done){
		var id;
    var simpleServer = server({port : fhPORT, protocol : data.protocol}, {},
			function() {
console.log('\nChekpoint2!\n');
				agent
						[data.method.toLowerCase()](RUSHENDPOINT + data.path )
						.set('x-relayer-host', ENDPOINT)  //Always the same endpoint
						.set('x-relayer-persistence','BODY')
						.set('content-type','application/json')
						.set(data.headers)
						.send(data.body)
						.end(function(err, res) {
							expect(err).to.not.exist;
							expect(res.statusCode).to.eql(CREATED);
							expect(res.body).to.exist;
							expect(res.body.id).to.exist;
							id=res.body.id;
							res.text.should.not.include('exception');
							if (vm) {console.log(res.body.id);}
						//	done();
						 });
			},
			function(dataReceived) {
console.log('\nChekpoint3!\n');
				expect(dataReceived).to.exist;
				dataReceived.method.should.be.equal(data.method);
				dataRecived.url.should.be.equal(data.path);
				var checked = false;
				setTimeout(function() {
console.log('\nChekpoint4!\n');
					agent
							.get(RUSHENDPOINT +'/response/' + id)
							.end(function onResponse2(err, res) {
								expect(err).to.not.exist;
								expect(res).to.exist;
								expect(res.statusCode).to.equal(200);
								res.headers['content-type'].should.eql('application/json; charset=utf-8');
								res.text.should.include('id');
								res.text.should.include('state');

								if (vm) {console.log(res.body);}
								done();
							});
				}, TIMEOUT);
			});
		serversToShutDown.push(simpleServer);
	});
}


describe('Feature: Protocol '  + '#FPT', function() {
	this.timeout(6000);

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

	describe('Check single feature: accepting request with a valid header policy request using', function () {

		var dataSetPOST = [
			{protocol : 'http', method: 'GET', path: '', headers: {}, body: {}, name : "PROTOCOL: 1 Should accept the request using HTTP /GET"}
		//	,{protocol : 'https', method: 'GET', path: '', headers: {'X-Relayer-Protocol':'https'}, body: {}, name : "PROTOCOL: 2 Should accept the request using HTTPS /GET"},
		//	{protocol : 'http', method: 'GET', path: '/', headers: {'X-Relayer-Protocol':'http'}, body: {}, name : "PROTOCOL: 3 Should accept the request using HTTP /POST"},
		//	{protocol : 'https', method: 'GET', path: '', headers: {'X-Relayer-Protocol':'https'}, body: {}, name : "PROTOCOL: 4 Should accept the request using HTTPS /POST"},
		];

		for(i=0; i < dataSetPOST.length; i++){
			_validScenario(dataSetPOST[i]);  //Launch every test in data set
		}
	});

});

//TODO: path different to empty
