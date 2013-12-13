var should = require('should');
var superagent = require('superagent');
var config = require('./config');
var chai = require('chai');
var expect = chai.expect;
var _ = require('underscore');
var async = require('async');
var server = require('./advancedServer.js');
var dbUtils = require('../dbUtils.js');

var consumer = require('../consumerLauncher.js');
var listener = require('../listenerLauncher.js');

// Verbose MODE
var vm = false;
if(vm){console.log('VERBOSE MODE: ON \n Feature to test BODY FORWARDING #FOW');}

// Time to wait to check the status of the task
var TIMEOUT = 100;
var CREATED = 201; // 200 for older versions
var INVALID_HEADERS = 400;
var describeTimeout = 5000;
var DEFAULT_PERSISTENCE = 'BODY';

//RUSH ENDPOINT
var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;
var RUSHENDPOINT = 'http://' + HOST + ':' + PORT;

//Final host endpoint
var fhHOST = config.simpleServerHostname;
var fhPORT = config.simpleServerPort;
var ENDPOINT = fhHOST + ':' + fhPORT;

//Accept self signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

//Temp Servers
var serversToShutDown = [];

function _validBody(data){
  'use strict';

	it(data.name + data.protocol.toUpperCase() +' /' +data.method +' #FOW', function(done){
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
						req = req.send(JSON.stringify(data.body));
					}
					req.end(function(err, res) {
						// Checks. Once request has been sent
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
					//CHECKS
					expect(dataReceived).to.exist;
					expect(dataReceived.body).to.exist;
					dataReceived.method.should.be.equal(data.method);
					dataReceived.url.should.be.equal(data.path);
          if (vm){
						console.log('\n // BODY SENT   :' , JSON.stringify(data.body));
						console.log('\n // BODY RELAYED:' , dataReceived.body);
					}
					var parsedBody = JSON.parse(dataReceived.body);
					//parsedBody.should.have.property('parameter1', data.body.parameter1);
					//parsedBody.should.have.property('parameter2', data.body.parameter2);
          dataReceived.body.should.equal(JSON.stringify(data.body));

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


describe('Multiple Feature: Body '  + '#FEH', function() {
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

	describe('Body sent to Rush should remain the same as the received in the final endpoint #FOW', function () {


		var body = {
			'parameter1':'urls',
			'parameter2': [
				encodeURIComponent('field1: X-relayer-NoHost:localhost:8000'),
				encodeURIComponent('field2: ) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.57 '),
				encodeURIComponent('field3')
			].join(', ')
    };


		var body1 = {
			'parameter1':'numbers',
			'parameter2': [
				encodeURIComponent('0,000000000000000000000000000000000000000000000000000000000001'),
				encodeURIComponent('9\'999999999999999999999999999999999999999999999999999999999999'),
				encodeURIComponent('5.555555555555555555555555555555555555555555555555555555555555')
			].join(', ')
    };


		var body2 = {
			'parameter1':'variables',
			'parameter2': [
				encodeURIComponent('field1: X-relayer-NoHost:localhost:8000'),
				encodeURIComponent('field2: ) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.57 '),
				encodeURIComponent('field3')
			].join(', ')
    };


		var body3 = {
			'parameter1':'garble',
			'parameter2': [
				encodeURIComponent('qÃ®Ã¼Ã¶:Ã·Z<Ã˜Â¸ÂÃºSx6Ã\ÂÃ´'),
				encodeURIComponent('Ã¼wÃ€nÃÃž.ËœÃÃ¨tÂ¨ÃŸ Â§ Â»#<!â€™;Ãƒ5	Ã£:=â€ºÃ 4V?Ã„u,Â¥j	Ã¯f&Ã*u\-h-^Å¾'),
				encodeURIComponent('     \n')
			].join(', ')
    };


		var dataSetHTTP = [
			{protocol : 'http', method: 'POST', path: '/', headers: {}, body: body,
        name : 'Case 1 Should accept the request and maintain the Body '},
			{protocol : 'http', method: 'POST', path: '/', headers: {}, body: body1,
        name : 'Case 2 Should accept the request and maintain the Body '},
			{protocol : 'http', method: 'POST', path: '/', headers: {}, body: body2,
        name : 'Case 3 Should accept the request and maintain the Body '},
			{protocol : 'http', method: 'POST', path: '/', headers: {}, body: body3,
        name : 'Case 4 Should accept the request and maintain the Body '},
			{protocol : 'http', method: 'PUT', path: '/', headers: {}, body: body,
        name : 'Case 5 Should accept the request and maintain the Body '},
			{protocol : 'http', method: 'PUT', path: '/', headers: {}, body: body1,
        name : 'Case 6 Should accept the request and maintain the Body '},
			{protocol : 'http', method: 'PUT', path: '/', headers: {}, body: body2,
        name : 'Case 7 Should accept the request and maintain the Body '},
			{protocol : 'http', method: 'PUT', path: '/', headers: {}, body: body3,
        name : 'Case 8 Should accept the request and maintain the Body '}
		];

		for(var i=0; i < dataSetHTTP.length; i++){
			_validBody(dataSetHTTP[i]);  //Launch every test in data set
		}
	});

});

