var should = require('should');
var superagent = require('superagent');
var config = require('./config');
var chai = require('chai');
var expect = chai.expect;
var _ = require('underscore');
var async = require('async');
var server = require('./advancedServer.js');

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

// Time to wait to check the status of the task
var TIMEOUT = 600;
var CREATED = 201;
var describeTimeout = 5000;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; //Accept self signed certs

function _validScenario(data){

	it(data.name +  ' #FPT', function(done){
		var agent = superagent.agent();
		var id;

		var method;
			switch(data.method){
				case "DELETE":
					method = 'del';
					break;
				default:
					method = data.method.toLowerCase()
			}
		var simpleServer = server({port : fhPORT, protocol : data.protocol}, {},
			function connectedCallback() {

				var req = agent
						[method](RUSHENDPOINT + data.path )
						.set('x-relayer-host', ENDPOINT)  //Always the same endpoint
						.set('x-relayer-persistence','BODY')
						.set('content-type','application/json')
						.set(data.headers)
						if(data.method === 'POST' || data.method === 'PUT'){
							req = req.send(data.body);
						}
						req.end(function(err, res) {
							expect(err).to.not.exist;
							expect(res.statusCode).to.eql(CREATED);
							expect(res.body).to.exist;
							expect(res.body.id).to.exist;
							id=res.body.id;
							res.text.should.not.include('exception');
						//	done();
						 });
			},
			function(dataReceived) {
				expect(dataReceived).to.exist;
				dataReceived.method.should.be.equal(data.method);
				dataReceived.url.should.be.equal(data.path);
        if(data.responseHeaders){
          Object.keys(data.responseHeaders).forEach(function(rhk){
            expect(dataReceived.headers[rhk.toLowerCase()]).to.exist;
            dataReceived.headers[rhk.toLowerCase()].trim().should.eql(data.responseHeaders[rhk].trim())
          })
        }

				var checked = false;
				setTimeout(function() {
					agent
							.get(RUSHENDPOINT +'/response/' + id)
							.end(function onResponse2(err, res) {
								expect(err).to.not.exist;
								expect(res).to.exist;
								expect(res.statusCode).to.equal(200);
								expect(res.body).to.exist;
								expect(res.body['body']).to.equal('Request Accepted')
								res.headers['content-type'].should.eql('application/json; charset=utf-8');
								res.text.should.include('id');
								res.text.should.include('state');

								done();
							});
				}, TIMEOUT);
			});
		serversToShutDown.push(simpleServer);
	});
}


describe('Feature: Extra header '  + '#FPT', function() {
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


	describe('Retrieve request with a valid header policy request using HTTPS #FPT', function () {

    var responseHeaders = {"Fake-User-Agent":"Mozilla/5.0 (Macintosh++; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.57 ",
        "Accept-Language":"es-ES,es;q=0.8", x: "X-relayer-NoHost:localhost:8000"
    };
    var extraHeaders = {'X-Relayer-Protocol':'https', "X-Relayer-Header": [
      encodeURIComponent("X: X-relayer-NoHost:localhost:8000"),
      encodeURIComponent("Fake-User-Agent:Mozilla/5.0 (Macintosh++; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.57 "),
      encodeURIComponent("Accept-Language:es-ES,es;q=0.8")].join(", ")};
		var dataSetPOST = [
			{protocol : 'https', method: 'GET', path: '/', headers: extraHeaders, body: {},
        name : "PROTOCOL: 1 Should accept the request using HTTPS /GET", responseHeaders: responseHeaders},
			{protocol : 'https', method: 'POST', path: '/', headers: extraHeaders, body: {},
        name : "PROTOCOL: 2 Should accept the request using HTTPS /POST", responseHeaders: responseHeaders},
			{protocol : 'https', method: 'PUT', path: '/', headers: extraHeaders, body: {},
        name : "PROTOCOL: 3 Should accept the request using HTTPS /PUT", responseHeaders: responseHeaders},
			{protocol : 'https', method: 'DELETE', path: '/', headers: extraHeaders, body: {},
        name : "PROTOCOL: 4 Should accept the request using HTTPS /DELETE", responseHeaders: responseHeaders}
		];

		for(i=0; i < dataSetPOST.length; i++){
			_validScenario(dataSetPOST[i]);  //Launch every test in data set
		}
	});

	describe('Retrieve request with a valid header policy request using HTTP #FPT', function () {
    var responseHeaders = {"Fake-User-Agent":"Mozilla/5.0 (Macintosh++; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.57 ",
      "Accept-Language":"es-ES,es;q=0.8", x: "X-relayer-NoHost:localhost:8000"
       };
    var extraHeaders = {'X-Relayer-Protocol':'http', "X-Relayer-Header": [
      encodeURIComponent("X: X-relayer-NoHost:localhost:8000"),
      encodeURIComponent("Fake-User-Agent:Mozilla/5.0 (Macintosh++; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.57 "),
      encodeURIComponent("Accept-Language:es-ES,es;q=0.8")].join(", ")};
		var dataSetPOST = [
      {protocol : 'http', method: 'GET', path: '/', headers: extraHeaders, body: {},
        name : "PROTOCOL: 1 Should accept the request using HTTPS /GET", responseHeaders: responseHeaders},
			{protocol : 'http', method: 'POST', path: '/', headers: {'X-Relayer-Protocol':'http'}, body: {}, name : "PROTOCOL: 2 Should accept the request using HTTP /POST"},
			{protocol : 'http', method: 'PUT', path: '/', headers: {'X-Relayer-Protocol':'http'}, body: {}, name : "PROTOCOL: 3 Should accept the request using HTTP /PUT"},
			{protocol : 'http', method: 'DELETE', path: '/', headers: {'X-Relayer-Protocol':'http'}, body: {}, name : "PROTOCOL: 4 Should accept the request using HTTP /DELETE"}
		];

		for(i=0; i < dataSetPOST.length; i++){
			_validScenario(dataSetPOST[i]);  //Launch every test in data set
		}
	});


});

//TODO: path different to empty
