var should = require('should');
var superagent = require('superagent');
var config = require('./config');
var chai = require('chai');
var expect = chai.expect;
var _ = require('underscore');
var async = require('async');
var server = require('./advancedServer.js');
var dbUtils = require('../dbUtils.js');

var consumer = require('../../lib/consumer.js');
var listener = require('../../lib/listener.js');

// Verbose MODE
var vm = false;
if(vm){console.log('VERBOSE MODE: ON \n Feature to test EXTRA_HEADER #FEH');}

// Time to wait to check the status of the task
var TIMEOUT = 100;
var CREATED = 201; // 200 for older versions
var INVALID_HEADERS = 400;
var describeTimeout = 5000;
DEFAULT_PERSISTENCE = 'BODY';

//RUSH ENDPOINT
var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;
var RUSHENDPOINT = 'http://' + HOST + ':' + PORT;

//Final host endpoint
var fhHOST = config.simpleServerHostname;
var fhPORT = config.simpleServerPort;
ENDPOINT = fhHOST + ':' + fhPORT;

//Accept self signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

//Temp Servers
var serversToShutDown = [];

function _validScenario(data){
  'use strict';
  it('Case ' + data.name + data.protocol.toUpperCase() +' /' +data.method +' #FEH', function(done){
		var agent = superagent.agent();
		var id;

		var method;
    switch(data.method){
    case 'DELETE':
      method = 'del';
      break;
    default:
      method = data.method.toLowerCase();
    }

		var simpleServer = server({port : fhPORT, protocol : data.protocol}, {},
			function connectedCallback() {

				//SET UP the request to the advancedServer
				var req = agent
						[method](RUSHENDPOINT + data.path )
						.set('x-relayer-host', ENDPOINT)  //Always the same endpoint
						.set('x-relayer-persistence',DEFAULT_PERSISTENCE)
						.set('content-type','application/json')
						.set(data.headers);

        if(data.method.toUpperCase() === 'POST' || data.method.toUpperCase() === 'PUT'){
          req = req.send(data.body);
        }

        req.end(function(err, res) {
          expect(err).to.not.exist;
          expect(res.statusCode).to.eql(CREATED);
          expect(res.body).to.exist;
          expect(res.body.id).to.exist;
          if(vm){console.log(res.body.id);}
          id=res.body.id;
          res.text.should.not.include('exception');
        });
			},
				//DATA inside de advancedServer
			function(dataReceived) {
				expect(dataReceived).to.exist;
				dataReceived.method.should.be.equal(data.method);
				dataReceived.url.should.be.equal(data.path);
        if(data.responseHeaders){
          Object.keys(data.responseHeaders).forEach(
              function(rhk){
                expect(dataReceived.headers[rhk.toLowerCase()]).to.exist;
                if(vm){console.log('// DATA RECEIVED: ', rhk.toLowerCase(),  dataReceived.headers[rhk.toLowerCase()]);}
                dataReceived.headers[rhk.toLowerCase()].trim().should.eql(data.responseHeaders[rhk].trim());
              });
        }

				//Checks in the retrieved task response from RUSH
				var checked = false;
				setTimeout(function() {
					agent
							.get(RUSHENDPOINT +'/response/' + id)
							.end(function onResponse2(err2, res2) {
								expect(err2).to.not.exist;
								expect(res2).to.exist;
								expect(res2.statusCode).to.exist;
								expect(res2.statusCode).to.equal(200);
								expect(res2.body).to.exist;
								if(vm){console.log('// RUSH RESPONSE: ', res2.body);}
								expect(res2.body['body']).to.equal('Request Accepted');
								res2.headers['content-type'].should.eql('application/json; charset=utf-8');
								res2.text.should.include('id');
								res2.text.should.include('state');
								res2.body['state'].should.eql('completed');
								done();
							});
				}, TIMEOUT);
			});
		serversToShutDown.push(simpleServer);
	});
}

function _invalidScenario(data){
  'use strict';
  it('Case ' + data.name + data.protocol.toUpperCase() +' /' +data.method +' #FEH', function(done){
		var agent = superagent.agent();
		var id;

		var method;
		switch(data.method){
    case 'DELETE':
      method = 'del';
      break;
    default:
      method = data.method.toLowerCase();
		}

		var simpleServer = server({port : fhPORT, protocol : data.protocol}, {},
				function connectedCallback() {

					//SET UP the request to the advancedServer
					var req = agent
							[method](RUSHENDPOINT + data.path )
							.set('x-relayer-host', ENDPOINT)  //Always the same endpoint
							.set('x-relayer-persistence',DEFAULT_PERSISTENCE)
							.set('content-type','application/json')
							.set(data.headers);
					if(data.method.toUpperCase() === 'POST' || data.method.toUpperCase() === 'PUT'){
						req = req.send(data.body);
					}
					req.end(function(err, res) {
						expect(err).to.not.exist;
						expect(res.statusCode).to.eql(CREATED);
						expect(res.body).to.exist;
						expect(res.body.id).to.exist;
						if(vm){console.log(res.body.id);}
						id=res.body.id;
						res.text.should.not.include('exception');
					});
				},
				//DATA inside de advancedServer
				function(dataReceived) {
					expect(dataReceived).to.exist;
					dataReceived.method.should.be.equal(data.method);
					dataReceived.url.should.be.equal(data.path);
					if(data.responseHeaders){
						Object.keys(data.responseHeaders).forEach(
								function(rhk){
									expect(dataReceived.headers[rhk.toLowerCase()]).to.exist;
									if(vm){console.log('// DATA RECEIVED: ', rhk.toLowerCase(), dataReceived.headers[rhk.toLowerCase()]);}
									dataReceived.headers[rhk.toLowerCase()].trim().should.eql(data.responseHeaders[rhk].trim());
                });
					}

					//Checks in the retrieved task response from RUSH
					var checked = false;
					setTimeout(function() {
						agent
								.get(RUSHENDPOINT +'/response/' + id)
								.end(function onResponse2(err2, res2) {
									expect(err2).to.not.exist;
									expect(res2).to.exist;
									expect(res2.statusCode).to.exist;
									expect(res2.statusCode).to.equal(200);
									expect(res2.body).to.exist;
									if(vm){console.log('// RUSH RESPONSE: ', res2.body);}
									expect(res2.body['body']).to.equal('Request Accepted');
									res2.headers['content-type'].should.eql('application/json; charset=utf-8');
									res2.text.should.include('id');
									res2.text.should.include('state');
									res2.body['state'].should.eql('completed');
									done();
								});
					}, TIMEOUT);
				});
		serversToShutDown.push(simpleServer);
	});
}

function _invalidHeadersValue(data) {
  'use strict';
  it('Case ' + data.name + data.protocol.toUpperCase() +' /' +data.method +' #FEH', function(done){
    var agent = superagent.agent();
    var id;

    var method;
    switch(data.method){
    case 'DELETE':
      method = 'del';
      break;
    default:
      method = data.method.toLowerCase();
    }

    //SET UP the request to the advancedServer
    var req = agent
        [method](RUSHENDPOINT + data.path )
        .set('x-relayer-host', ENDPOINT)  //Always the same endpoint
        .set('x-relayer-persistence',DEFAULT_PERSISTENCE)
        .set('content-type','application/json')
        .set(data.headers);
    if(data.method.toUpperCase() === 'POST' || data.method.toUpperCase() === 'PUT'){
      req = req.send(data.body);
    }
    req.end(function(err, res) {
      expect(err).to.not.exist;
      expect(res.statusCode).to.eql(INVALID_HEADERS);
      expect(res.body).to.exist;
      expect(res.body.exceptionId).to.eql('SVC0002');
      expect(res.body.exceptionText).to.eql('Invalid parameter value: x-relayer-header');

      expect(res.body.userMessage).to.eql('Value for header ' + data.invalidHeader +' is not defined');

      if(vm){console.log(res.body.userMessage);}

      done();
    });

  });
}



describe('Single Feature: Extra header '  + '#FEH', function() {
  'use strict';
	this.timeout(describeTimeout);
	//Start Rush before every test launch
	before(function (done) {
		listener.start(function() {
			consumer.start(done);
		});
	});

	//Stop Rush after every test launch
	after(function (done) {
		listener.stop(function() {
			consumer.stop(done);
		});
    dbUtils.exit();
	});

	afterEach(function() {
		for (var i = 0; i < serversToShutDown.length; i++) {
			try {
				serversToShutDown[i].close();
			} catch (e) {}
		}
		serversToShutDown = [];
	});

  beforeEach(function(done){
    dbUtils.cleanDb(done);
  });


	describe('Retrieve request with a valid header policy request using HTTPS #FEH', function () {

    var responseHeaders1 = {
      'Fake-User-Agent':'Mozilla/5.0 (Macintosh++; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko) ' +
          'Chrome/29.0.1547.57 ',
      'Accept-Language':'es-ES,es;q=0.8',
      'x': 'X-relayer-NoHost:localhost:8000'
    };
    var extraHeaders1 = {
      'X-Relayer-Protocol':'https',
      'X-Relayer-Header': [
        encodeURIComponent('X: X-relayer-NoHost:localhost:8000'),
        encodeURIComponent('Fake-User-Agent:Mozilla/5.0 (Macintosh++; Intel Mac OS X 10_8_4) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/29.0.1547.57 '),
        encodeURIComponent('Accept-Language:es-ES,es;q=0.8')
      ].join(', ')
    };
    var responseHeaders2 = {
      'Fake-User-Agent':'Mozilla/5.0 (Macintosh++; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko) ' +
          'Chrome/29.0.1547.57 ',
      'Accept-Language':'',
      'x': 'X-relayer-NoHost:localhost:8000'
    };
    var extraHeaders2 = {
      'X-Relayer-Protocol':'https',
      'X-Relayer-Header': [
        encodeURIComponent('X: X-relayer-NoHost:localhost:8000'),
        encodeURIComponent('Fake-User-Agent:Mozilla/5.0 (Macintosh++; Intel Mac OS X 10_8_4) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/29.0.1547.57 '),
        encodeURIComponent('Accept-Language:')
      ].join(', ')
    };

		var dataSetHTTPS = [
			{protocol : 'HTTPS', method: 'GET', path: '/', headers: extraHeaders1, body: {},
        name : '1 Should accept the request using ', responseHeaders: responseHeaders1},
			{protocol : 'HTTPS', method: 'POST', path: '/', headers: extraHeaders1, body: {},
        name : '2 Should accept the request using ', responseHeaders: responseHeaders1},
			{protocol : 'HTTPS', method: 'PUT', path: '/', headers: extraHeaders1, body: {},
        name : '3 Should accept the request using ', responseHeaders: responseHeaders1},
			{protocol : 'HTTPS', method: 'DELETE', path: '/', headers: extraHeaders1, body: {},
        name : '4 Should accept the request using ', responseHeaders: responseHeaders1},
      {protocol : 'HTTPS', method: 'GET', path: '/', headers: extraHeaders2, body: {},
        name : '5 Should accept the request using ', responseHeaders: responseHeaders2},
      {protocol : 'HTTPS', method: 'POST', path: '/', headers: extraHeaders2, body: {},
        name : '6 Should accept the request using ', responseHeaders: responseHeaders2},
      {protocol : 'HTTPS', method: 'PUT', path: '/', headers: extraHeaders2, body: {},
        name : '7 Should accept the request using ', responseHeaders: responseHeaders2},
      {protocol : 'HTTPS', method: 'DELETE', path: '/', headers: extraHeaders2, body: {},
        name : '8 Should accept the request using ', responseHeaders: responseHeaders2}
		];

		for(var i=0; i < dataSetHTTPS.length; i++){
			_validScenario(dataSetHTTPS[i]);  //Launch every test in data set
		}
	});

	describe('Retrieve request with a valid header policy request using HTTP #FEH', function () {
    var responseHeaders = {
      'Fake-User-Agent':'Mozilla/5.0 (Macintosh++; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko) ' +
          'Chrome/29.0.1547.57 ',
      'Accept-Language':'es-ES,es;q=0.8',
      'x': 'X-relayer-NoHost:localhost:8000'
    };

    var extraHeaders = {
      'X-Relayer-Protocol':'http',
      'X-Relayer-Header': [
        encodeURIComponent('X: X-relayer-NoHost:localhost:8000'),
        encodeURIComponent('Fake-User-Agent:Mozilla/5.0 (Macintosh++; Intel Mac OS X 10_8_4) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/29.0.1547.57 '),
        encodeURIComponent('Accept-Language:es-ES,es;q=0.8')
      ].join(', ')
    };

		var dataSetHTTP = [
      {protocol : 'http', method: 'GET', path: '/', headers: extraHeaders, body: {},
        name : '1 Should accept the request using ', responseHeaders: responseHeaders},
			{protocol : 'http', method: 'POST', path: '/', headers: extraHeaders, body: {},
				name : '2 Should accept the request using ', responseHeaders: responseHeaders},
			{protocol : 'http', method: 'PUT', path: '/', headers: extraHeaders, body: {},
				name : '3 Should accept the request using ', responseHeaders: responseHeaders},
			{protocol : 'http', method: 'DELETE', path: '/', headers:extraHeaders, body: {},
				name : '4 Should accept the request using ', responseHeaders: responseHeaders}
		];

		for(var i=0; i < dataSetHTTP.length; i++){
			_validScenario(dataSetHTTP[i]);  //Launch every test in data set
		}
	});


	describe('Retrieve request with an ExtraHeader inside another ExtraHeader request #FEH', function () {
		var responseHeaders = {
			'header_uno': 'header_1',
			'header_dos': 'header_2',
			'header_tres': 'header_3',
			'x': 'X-relayer-NoHost:localhost:8000',
      'garbled' :' Japan Listen/dʒəˈpæn/ (Japanese: 日本 Nippon or Nihon; formally 日本国 About this sound ' +
          'Nippon-koku or Nihon-koku, literally [the] State of Japan) ',
			'X-Relayer-Header': 'test:test'
		};

		var extraHeaders = {
      'X-Relayer-Protocol':'http',
      'X-Relayer-Header': [
        encodeURIComponent('X: X-relayer-NoHost:localhost:8000'),
        encodeURIComponent('header_uno: header_1'),
        encodeURIComponent('header_dos: header_2'),
        encodeURIComponent('header_tres: header_3'),
        encodeURIComponent('garbled:Japan Listen/dʒəˈpæn/ (Japanese: 日本 Nippon or Nihon; formally 日本国 About this ' +
            'sound Nippon-koku or Nihon-koku, literally [the] State of Japan) '),
        encodeURIComponent('X-Relayer-Header: test:test')
      ].join(', ')
    };

		var extraHeaders2 = {
      'X-Relayer-Protocol':'https',
      'X-Relayer-Header': [
        encodeURIComponent('X: X-relayer-NoHost:localhost:8000'),
        encodeURIComponent('header_uno: header_1'),
        encodeURIComponent('header_dos: header_2'),
        encodeURIComponent('header_tres: header_3'),
        encodeURIComponent('garbled:Japan Listen/dʒəˈpæn/ (Japanese: 日本 Nippon or Nihon; formally 日本国 About this ' +
            'sound Nippon-koku or Nihon-koku, literally [the] State of Japan) '),
        encodeURIComponent('X-Relayer-Header: test:test')
      ].join(', ')
    };

		var dataSetHTTP = [
			{protocol : 'http', method: 'GET', path: '/', headers: extraHeaders, body: {},
				name : '1 Should sent the extra header without filter it as a valid extra header ',
        responseHeaders: responseHeaders},
			{protocol : 'http', method: 'POST', path: '/', headers: extraHeaders, body: {},
				name : '2 Should sent the extra header without filter it as a valid extra header ',
        responseHeaders: responseHeaders},
			{protocol : 'http', method: 'PUT', path: '/', headers: extraHeaders, body: {},
				name : '3 Should sent the extra header without filter it as a valid extra header ',
        responseHeaders: responseHeaders},
			{protocol : 'http', method: 'DELETE', path: '/', headers:extraHeaders, body: {},
				name : '4 Should sent the extra header without filter it as a valid extra header ',
        responseHeaders: responseHeaders},
			{protocol : 'https', method: 'GET', path: '/', headers: extraHeaders2, body: {},
				name : '5 Should sent the extra header without filter it as a valid extra header ',
        responseHeaders: responseHeaders},
			{protocol : 'https', method: 'POST', path: '/', headers: extraHeaders2, body: {},
				name : '6 Should sent the extra header without filter it as a valid extra header ',
        responseHeaders: responseHeaders},
			{protocol : 'https', method: 'PUT', path: '/', headers: extraHeaders2, body: {},
				name : '7 Should sent the extra header without filter it as a valid extra header ',
        responseHeaders: responseHeaders},
			{protocol : 'https', method: 'DELETE', path: '/', headers:extraHeaders2, body: {},
				name : '8 Should sent the extra header without filter it as a valid extra header ',
        responseHeaders: responseHeaders}
		];

		for(var i=0; i < dataSetHTTP.length; i++){
			_invalidScenario(dataSetHTTP[i]);  //Launch every test in data set
		}
	});

  describe('Retrieve request with an invalid ExtraHeader #FEH', function () {

    var INVALID_HEADER = 'Accept-Value';

    var extraHeaders = {
      'X-Relayer-Header': [
        encodeURIComponent('X: X-relayer-NoHost:localhost:8000'),
        encodeURIComponent('Fake-User-Agent:Mozilla/5.0 (Macintosh++; Intel Mac OS X 10_8_4) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/29.0.1547.57 '),
        encodeURIComponent(INVALID_HEADER)
      ].join(', ')
    };

    var dataSetHTTP = [
      {protocol : 'http', method: 'GET', path: '/', headers: extraHeaders, body: {},
        name : '1 Should not accept the request: ' + INVALID_HEADER + ' has not a defined value using ',
        invalidHeader: INVALID_HEADER },
      {protocol : 'http', method: 'POST', path: '/', headers: extraHeaders, body: {},
        name : '2 Should not accept the request: ' + INVALID_HEADER + ' has not a defined value using ',
        invalidHeader: INVALID_HEADER },
      {protocol : 'http', method: 'PUT', path: '/', headers: extraHeaders, body: {},
        name : '3 Should not accept the request: ' + INVALID_HEADER + ' has not a defined value using ',
        invalidHeader: INVALID_HEADER },
      {protocol : 'http', method: 'DELETE', path: '/', headers: extraHeaders, body: {},
        name : '4 Should not accept the request: ' + INVALID_HEADER + ' has not a defined value using ',
        invalidHeader: INVALID_HEADER }
    ];

    for(var i=0; i < dataSetHTTP.length; i++){
      _invalidHeadersValue(dataSetHTTP[i]);  //Launch every test in data set
    }
  });


});

//TODO: path different to empty
