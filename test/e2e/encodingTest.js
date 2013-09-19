var http = require('http');
var fs = require('fs');
var path = require('path');
var should = require('should');
var config = require('./config');
var utils = require('./utils.js');
var superagent = require('superagent');
var chai = require('chai');
var expect = chai.expect;
var _ = require('underscore');
var async = require('async');
var server = require('./simpleServer.js');

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

var DIR_MODULE = path.dirname(module.filename);


function _invalidScenario(data){
	it(data.name + ' #FEN', function(done){

		var agent = superagent.agent();
		agent
				[data.method.toLowerCase()](RUSHENDPOINT )
				.set('x-relayer-host', ENDPOINT)  //Always the same endpoint
				.set("x-relayer-persistence","BODY")
				.set(data.headers)
				.send({})
				.end(function(err, res) {
					expect(err).to.not.exist;
					expect(res.statusCode).to.equal(201);
					expect(res.body).to.exist;
					expect(res.body.id).to.exist;
					res.text.should.not.include('exception');
					if (vm) {console.log(res.body.id);}
					setTimeout(function () {
						agent
								.get(RUSHENDPOINT +'/response/' + res.body['id'])
								.end(function onResponse2(err2, res2) {
									res2.headers['content-type'].should.eql('application/json; charset=utf-8');
									expect(res.statusCode).to.equal(CREATED);
									res2.text.should.include('id');
									//res2.text.should.not.include('exception');
									if (data.headers['X-Relayer-Encoding']) {
										res2.headers['content-type'].should.eql('application/json; charset=utf-8');
									}
									if (vm) {
										console.log(res2.body);
										console.log(res2.headers);
									}
									done();
								});

					}, TIMEOUT);
				});
	});
}

describe('Single Feature: Encoding #FEN', function() {
	 this.timeout(describeTimeout);

	var serversToShutDown = [];
  var simpleserver, petitionID;
  var contentBinary = fs.readFileSync(DIR_MODULE + '/robot.png');

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
			} catch (e) {

			}
		}
		serversToShutDown = [];
	});


	describe('Encoding: Rush should accept encoding request bypassed to the Target direcly (UTF-8 by default)', function () {
		var dataSet = [
			{method: 'GET', path: '', headers: {'X-Relayer-Encoding':'UTF-8'}, body: {}, name : " 1 Should accept the request with a real protocol UTF-8 /GET"},
			{method: 'GET', path: '', headers: {'X-Relayer-Encoding':'UTF8'}, body: {}, name : " 2 Should accept the request with a real protocol UTF8 /GET"},
			{method: 'GET', path: '', headers: {'X-Relayer-Encoding':'utf8'}, body: {}, name : " 3 Should accept the request with a real protocol utf8 /GET"},
			{method: 'GET', path: '', headers: {'X-Relayer-Encoding':'QUOTED-PRINTABLE'}, body: {}, name : " 4 Should accept the request with a real protocol QUOTED-PRINTABLE /GET"},
			{method: 'GET', path: '', headers: {'X-Relayer-Encoding':'8BIT'}, body: {}, name : " 5 Should accept the request with a real protocol 8BIT /GET"},
			{method: 'GET', path: '', headers: {'X-Relayer-Encoding':'7BIT'}, body: {}, name : " 6 Should accept the request with a real protocol 7BIT /GET"},
			{method: 'GET', path: '', headers: {'X-Relayer-Encoding':'BINARY'}, body: {}, name : " 7 Should accept the request with a real protocol BINARY /GET"},
			{method: 'GET', path: '', headers: {'X-Relayer-Encoding':'x'}, body: {}, name : " 8 Should accept the request using a fake encoding 'x' /GET"}
		];

		for(i=0; i < dataSet.length; i++){
			_invalidScenario(dataSet[i]);  //Launch every test in data set
		}
	});


	describe('Encoding: Rush should accept encoding request bypassed to the Target direcly (UTF-8 by default)', function () {
		var dataSet = [
			{method: 'POST', path: '', headers: {'X-Relayer-Encoding':'UTF-8'}, body: {}, name : " 1 Should accept the request with a real protocol UTF-8 /POST"},
			{method: 'POST', path: '', headers: {'X-Relayer-Encoding':'UTF8'}, body: {}, name : " 2 Should accept the request with a real protocol UTF8 /POST"},
			{method: 'POST', path: '', headers: {'X-Relayer-Encoding':'utf8'}, body: {}, name : " 3 Should accept the request with a real protocol utf8 /POST"},
			{method: 'POST', path: '', headers: {'X-Relayer-Encoding':'QUOTED-PRINTABLE'}, body: {}, name : " 4 Should accept the request with a real protocol QUOTED-PRINTABLE /POST"},
			{method: 'POST', path: '', headers: {'X-Relayer-Encoding':'8BIT'}, body: {}, name : " 5 Should accept the request with a real protocol 8BIT /POST"},
			{method: 'POST', path: '', headers: {'X-Relayer-Encoding':'7BIT'}, body: {}, name : " 6 Should accept the request with a real protocol 7BIT /POST"},
			{method: 'POST', path: '', headers: {'X-Relayer-Encoding':'BINARY'}, body: {}, name : " 7 Should accept the request with a real protocol BINARY /POST"},
			{method: 'POST', path: '', headers: {'X-Relayer-Encoding':'x'}, body: {}, name : " 8 Should accept the request using a fake encoding (x) /POST"}
		];

		for(i=0; i < dataSet.length; i++){
			_invalidScenario(dataSet[i]);  //Launch every test in data set
		}
	});


	describe('Encoding: Rush should accept encoding request bypassed to the Target direcly (UTF-8 by default)', function () {
		var dataSet = [
			{method: 'PUT', path: '', headers: {'X-Relayer-Encoding':'UTF-8'}, body: {}, name : " 1 Should accept the request with a real protocol UTF-8 /PUT"},
			{method: 'PUT', path: '', headers: {'X-Relayer-Encoding':'UTF8'}, body: {}, name : " 2 Should accept the request with a real protocol UTF8 /PUT"},
			{method: 'PUT', path: '', headers: {'X-Relayer-Encoding':'utf8'}, body: {}, name : " 3 Should accept the request with a real protocol utf8 /PUT"},
			{method: 'PUT', path: '', headers: {'X-Relayer-Encoding':'QUOTED-PRINTABLE'}, body: {}, name : " 4 Should accept the request with a real protocol QUOTED-PRINTABLE /PUT"},
			{method: 'PUT', path: '', headers: {'X-Relayer-Encoding':'8BIT'}, body: {}, name : " 5 Should accept the request with a real protocol 8BIT /PUT"},
			{method: 'PUT', path: '', headers: {'X-Relayer-Encoding':'7BIT'}, body: {}, name : " 6 Should accept the request with a real protocol 7BIT /PUT"},
			{method: 'PUT', path: '', headers: {'X-Relayer-Encoding':'BINARY'}, body: {}, name : " 7 Should accept the request with a real protocol BINARY /PUT"},
			{method: 'PUT', path: '', headers: {'X-Relayer-Encoding':'x'}, body: {}, name : " 8 Should accept the request using a fake encoding (x) /PUT"}
		];

		for(i=0; i < dataSet.length; i++){
			_invalidScenario(dataSet[i]);  //Launch every test in data set
		}
	});


describe('Encoding: Retrive an image encoded in BASE64', function () {

it('should return the image coded in base 64 #FEN', function(done) {

	function makeRequest() {
		var options = {};

		options.host = HOST;
		options.port = PORT;
		options.headers = {};
		options.method = 'GET';
		options.headers['content-type'] = 'application/json';
		options.headers['X-Relayer-Host'] =  config.simpleServerHostname + ':' + config.simpleServerPort,
				options.headers['X-relayer-persistence'] = 'BODY';
		options.headers['X-relayer-encoding'] = 'base64';

		utils.makeRequest(options, '', function(err, res) {
			petitionID = JSON.parse(res).id;
		});
	}

	//Launch Server
	simpleserver = http.createServer(function(req, res) {

		req.on('end', function() {
			res.writeHead(200);
			res.end(contentBinary);

			//Once the image has been written, polling is done until the image has been saved in redis or timeout.
			var checked = false;
			var interval = setInterval(function() {
				var options = {};

				options.host = config.rushServer.host;
				options.port = config.rushServer.port;
				options.path = '/response/' + petitionID;

				function checkResponse(err, data, res) {

					var parsedJSON = JSON.parse(data);

					if (!checked && res.statusCode !== 404 && parsedJSON.state === 'completed') {
						clearInterval(interval);

						should.not.exist(err);

						parsedJSON.should.have.property('body');
						parsedJSON.should.have.property('encoding', 'base64');

						var body = parsedJSON.body;
						var buf = new Buffer(contentBinary);
						var base64 = buf.toString('base64');
						body.should.be.equal(base64);

						done();
						checked = true;
					}
				}

				utils.makeRequest(options, '', checkResponse);
			}, 1);
		});

		req.resume();


	}).listen(config.simpleServerPort, makeRequest);    //The request is made when the server is running
	
	serversToShutDown.push(simpleserver);

});

});


});







