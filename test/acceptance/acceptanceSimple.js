var http = require('http');
var should = require('should');
var config = require('./config.js');
var server = require('./simpleServer.js');
var utils = require('./utils.js');

var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;

var HEADER_TEST_VALUE = 'valueTest';

var serversToShutDown = [];

function executeTest(method, content, done) {
	var headers = {
		//	'X-Relayer-Host': 'http://localhost:8014',
		//	'X-Relayer-Host': 'http://194.183.97.65:8014',
		//	'X-Relayer-Host': 'http://' + config.rushServer.hostname + ':8014', // + config.rushServer.port,
			'X-Relayer-Host': 'http://www.google.com',
     		'testheader': HEADER_TEST_VALUE
	};

	var options = {
		host: HOST,
		port: PORT,
		method: method,
		headers: headers
	};

	utils.makeRequest(options, content, function() {
		data.should.be.equal(content);
	});

	done();
}

describe('Oneway Acceptance basic funcionality TestSuite', function() {

	afterEach(function() {
		for (var i = 0; i < serversToShutDown.length; i++) {
			try {
				serversToShutDown[i].close();
			} catch (e) {

			}
		}

		serversToShutDown = [];
	});


it('Should return the same headers and the same method / GET 0', function(done) {
	setTimeout(done, 50000);
	executeTest('GET', undefined, done);
});

	it('Should return the same headers and the same method / POST 1', function(done) {
		var content = 'Hello World'
		executeTest('POST', content, done);
	});

	it('Should return the same headers and the same method / PUT 2', function(done) {
		var content = 'Hello World'
		executeTest('PUT', content, done);
	});

	it('Should return the same headers and the same method / GET 3', function(done) {
		executeTest('GET', undefined, done);
	});
	it('Should return the same headers and the same method / GET 4', function(done) {
		var content = 'Hello World'
		executeTest('POST', content, done);
	});

	it('Should  return the same headers content and the same method / PUT 5 ', function(done) {
		var content = 'Hello World &&&&&&'
		executeTest('PUT', content, done);
	});

	it('Should  return the same headers content and the same method / DELETE 6 ', function(done) {
		executeTest('GET', undefined, done);
	})
	it('Should  return the same headers content and the same method / POST 7 ', function(done) {
		var content = 'Hello World &&&&&&&'
		executeTest('POST', content, done);
	});

	it('Should  return the same headers content and the same method / PUT 8 ', function(done) {
		var content = 'Hello World &&&&&&&'
		executeTest('PUT', content, done);
	});

	it('Should  return the same headers content and the same method / DELETE 9', function(done) {
		executeTest('GET', undefined, done);
	})


});