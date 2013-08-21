var should = require('should');
var superagent = require('superagent');
var config = require('./config');
var chai = require('chai');
var expect = chai.expect;
var _ = require('underscore');
var async = require('async');
var server = require('./advancedServer.js');
//var server = require('./simpleServer.js');

var consumer = require('../../lib/consumer.js');
var listener = require('../../lib/listener.js');

//RUSH ENDPOINT
var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;
var RUSHENDPOINT = 'http://' + HOST + ':' + PORT;

//Final host endpoint
var fhHOST = config.simpleServerHostname;
var fhPORT = config.simpleServerPort; //8014;
var ENDPOINT = config.externalEndpoint;
if (!ENDPOINT){
	ENDPOINT = fhHOST + ':' + fhPORT;
	}

// Verbose MODE
var vm = false;
//var vm = false;

// Time to wait to check the status of the task
var TIMEOUT = 600;
var CREATED = 201;
var describeTimeout = 5000;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; //Accept self signed certs

var serversToShutDown = [];
var certB64 = 'LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tDQpNSUlDS1RDQ0FaSUNDUUQ1TUV2QUNNdU0wREFOQmdrcWhraUc5dzBCQVFVRkFEQlpNUXN3Q1FZRFZRUUdFd0pCDQpWVEVUTUJFR0ExVUVDQXdLVTI5dFpTMVRkR0YwWlRFaE1COEdBMVVFQ2d3WVNXNTBaWEp1WlhRZ1YybGtaMmwwDQpjeUJRZEhrZ1RIUmtNUkl3RUFZRFZRUUREQWxzYjJOaGJHaHZjM1F3SGhjTk1UTXdPREl3TVRFd056UXpXaGNODQpNVFF3T0RJd01URXdOelF6V2pCWk1Rc3dDUVlEVlFRR0V3SkJWVEVUTUJFR0ExVUVDQXdLVTI5dFpTMVRkR0YwDQpaVEVoTUI4R0ExVUVDZ3dZU1c1MFpYSnVaWFFnVjJsa1oybDBjeUJRZEhrZ1RIUmtNUkl3RUFZRFZRUUREQWxzDQpiMk5oYkdodmMzUXdnWjh3RFFZSktvWklodmNOQVFFQkJRQURnWTBBTUlHSkFvR0JBTTQwR0VhVEQvQkRxZm12DQpPRUdaYW9SZTJheWM2OVFJU1hWQnRmTVNwaXoxZ01DZ2ttUXdiaVo4L2U2WDZJaWxtZGhwbkp6YTVFL0drM2xqDQpmbWFHZnhHY0tsUHJlMXNJSTNTMEwyRzhUakgyZ2NNY0xtcnJpQTh5Rng5clNrRHVnaEJJNkJoMkVMczdUQ1NIDQphWUFoRFZDTTREUkZ0dFMvMXBMSmxrQk9ueGVqQWdNQkFBRXdEUVlKS29aSWh2Y05BUUVGQlFBRGdZRUFrcWVHDQpxYncrVjFDSzM2M2s3c0ZhUlgzUEpsZ2VnOU5iSUUxMEhKc21UcUI4anVxaWk5MVBRRkRFWnRjOWp2VHRMVVNzDQpqR3Zyd0hTQlNiR2ZTNnRNdjJQdHNnRzg4ZW9zRFRLbzBkM2padkFEVVlVZ2QyT0FaaWY0YkJLdjFMOGtVVE9NDQpYN1FxUFFCZmUyZG84WEdOQ3V6RlpGa2RseFd1VW9OV3pjbXkwaEU9DQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0t';

function _validScenario(data){
	it(data.name +  ' #FTC', function(done){
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
		var simpleServer = server({port : fhPORT, protocol : data.protocol}, {statusCode : '201'},
				function() {

					var req = agent
							[method](RUSHENDPOINT + data.path )
						//	.set('x-relayer-host', ENDPOINT)  //Always the same endpoint
							.set('x-relayer-host', 'localhost:8014')  //Hardcoded
							.set('x-relayer-persistence','BODY')
							.set('content-type','application/json')
							.set(data.headers)
					if(data.method === 'POST' || data.method === 'PUT'){
						req = req.send(data.body);
					}
					req.end(function(err, res) {
						if(vm){console.log(res.body);}
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
					if(vm){console.log('\n SERVER PATH: ' + dataReceived.url);}
					dataReceived.method.should.be.equal(data.method);
					dataReceived.url.should.be.equal(data.path);

					var checked = false;
					setTimeout(function() {
						agent
								.get(RUSHENDPOINT +'/response/' + id)
								.end(function onResponse2(err2, res2) {
									if(vm){
										console.log(res2);
										//console.log(res2.body);
										}
									expect(err2).to.not.exist;
									expect(res2).to.exist;
									expect(res2.statusCode).to.equal(200);
									expect(res2.body).to.exist;
									expect(res2.body['body']).to.equal('Request Accepted')
									res2.headers['content-type'].should.eql('application/json; charset=utf-8');
									res2.text.should.include('id');
									res2.text.should.include('state');
									res2.text.should.not.include('exception');

									done();
								});
					}, TIMEOUT);
				});
		serversToShutDown.push(simpleServer);
	});
}


function _invalidScenario(data){
	it(data.name +  ' #FTC', function(done){
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
		var simpleServer = server({port : fhPORT, protocol : data.protocol}, {statusCode : '501'},
				function() {

					var req = agent
							[method](RUSHENDPOINT + data.path )
						//	.set('x-relayer-host', ENDPOINT)  //Always the same endpoint
							.set('x-relayer-host', 'localhost:8014')  //Hardcoded
							.set('x-relayer-persistence','BODY')
							.set('content-type','application/json')
							.set(data.headers)
					if(data.method === 'POST' || data.method === 'PUT'){
						req = req.send(data.body);
					}
					req.end(function(err, res) {
						if(vm){console.log(res.body);}
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
					if(vm){console.log('\n SERVER PATH: ' + dataReceived.url);}
					dataReceived.method.should.be.equal(data.method);
					dataReceived.url.should.be.equal(data.path);

					var checked = false;
					setTimeout(function() {
						agent
								.get(RUSHENDPOINT +'/response/' + id)
								.end(function onResponse2(err2, res2) {
									if(vm){
									//	console.log(res2);
									console.log(res2.body);
									}

									expect(err2).to.not.exist;
									expect(res2).to.exist;
									expect(res2.statusCode).to.equal(200);
									expect(res2.body).to.exist;
									expect(res2.body['body']).to.equal('Request Accepted')
									res2.headers['content-type'].should.eql('application/json; charset=utf-8');
									res2.text.should.include('id');
									res2.text.should.include('state');
									res2.text.should.include('exception');
									//console.log(res2.body.exception);
									expect(res2.body.exception['exceptionId']).to.equal('SVC Relayed Host Error');
									if(vm){console.log(res2.body.exception.exceptionText);}
									//expect(res2.body.exception['exceptionText']).to.equal('DEPTH_ZERO_SELF_SIGNED_CERT');
									done();
								});
					}, TIMEOUT);
				});
		serversToShutDown.push(simpleServer);
	});
}


describe('Feature: Target Certificate '  + '#FTC', function() {
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


	describe('Retrieve request with a valid header policy request using HTTPS #FTC', function () {

		var dataSetPOST = [
			{protocol : 'https', method: 'GET', path: '/', headers: {'X-Relayer-Protocol':'https','x-relayer-server-cert':certB64}, body: {}, name : "Certificate: 1 Should accept the request using the target Certificate of the HTTPS server /GET"},
			{protocol : 'https', method: 'POST', path: '/', headers: {'X-Relayer-Protocol':'https','x-relayer-server-cert':certB64}, body: {}, name : "Certificate: 2 Should accept the request using the target Certificate of the HTTPS server /POST"},
			{protocol : 'https', method: 'PUT', path: '/', headers: {'X-Relayer-Protocol':'https','x-relayer-server-cert':certB64}, body: {}, name : "Certificate: 3 Should accept the request using the target Certificate of the HTTPS server /PUT"},
			{protocol : 'https', method: 'DELETE', path: '/', headers: {'X-Relayer-Protocol':'https','x-relayer-server-cert':certB64}, body: {}, name : "Certificate: 4 Should accept the request using the target Certificate of the HTTPS server /DELETE"},
			{protocol : 'https', method: 'GET', path: '/withpath', headers: {'X-Relayer-Protocol':'https','x-relayer-server-cert':certB64}, body: {}, name : "Certificate: 5 Should accept the request using the target Certificate of the HTTPS server adding a path /GET"},
			{protocol : 'https', method: 'POST', path: '/withpath', headers: {'X-Relayer-Protocol':'https','x-relayer-server-cert':certB64}, body: {}, name : "Certificate: 6 Should accept the request using the target Certificate of the HTTPS server adding a path /POST"}
		];

		for(i=0; i < dataSetPOST.length; i++){
			_validScenario(dataSetPOST[i]);  //Launch every test in data set
		}

		var dataSetInvalid = [
			{protocol : 'https', method: 'GET', path: '/', headers: {'X-Relayer-Protocol':'https','x-relayer-server-cert':'fakecert'}, body: {}, name : "Certificate: 1 Should reject the request using a fake Certificate of the HTTPS server /GET"},
			{protocol : 'https', method: 'POST', path: '/', headers: {'X-Relayer-Protocol':'https','x-relayer-server-cert':'fakecert'}, body: {}, name : "Certificate: 2 Should reject the request using a fake Certificate of the HTTPS server /POST"},
			{protocol : 'https', method: 'PUT', path: '/', headers: {'X-Relayer-Protocol':'https','x-relayer-server-cert':'fakecert'}, body: {}, name : "Certificate: 3 Should reject the request using a fake Certificate of the HTTPS server /PUT"},
			{protocol : 'https', method: 'DELETE', path: '/', headers: {'X-Relayer-Protocol':'https','x-relayer-server-cert':'fakecert'}, body: {}, name : "Certificate: 4 Should reject the request using a fake Certificate of the HTTPS server /DELETE"},
			{protocol : 'https', method: 'GET', path: '/withpath', headers: {'X-Relayer-Protocol':'https','x-relayer-server-cert':'fakecert'}, body: {}, name : "Certificate: 5 Should reject the request using a fake Certificate of the HTTPS server adding path /GET"},
			{protocol : 'https', method: 'POST', path: '/withpath', headers: {'X-Relayer-Protocol':'https','x-relayer-server-cert':'fakecert'}, body: {}, name : "Certificate: 6 Should reject the request using a fake Certificate of the HTTPS server adding path /POST"}
		];
		for(i=0; i < dataSetInvalid.length; i++){
			_invalidScenario(dataSetInvalid[i]);  //Launch every test in data set
		}


	});


});




/*
function _validScenario(data){
	it(data.name + ' #F3', function(done){

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

describe('Feature: Target Certficate  #FTC', function() {
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
			{method: 'GET', path: '', headers: {'X-Relayer-Encoding':'x'}, body: {}, name : " X Should accept the request using a fake encoding 'x' /GET"}
		];

		for(i=0; i < dataSet.length; i++){
			_validScenario(dataSet[i]);  //Launch every test in data set
		}
	});





describe('Encoding: Retrive an image encoded in BASE64', function () {

it('should return the image coded in base 64 #F3', function(done) {

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


    */




