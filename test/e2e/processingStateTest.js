var http = require('http');
var should = require('should');
var config = require('./config.js');
var utils = require('./utils.js');
var dbUtils = require('../dbUtils.js');


var consumer = require('../../lib/consumer.js');
var listener = require('../../lib/listener.js');

var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;

// Verbose MODE
var vm = false;
// Time to wait to check the status of the task
var TIMEOUT = 1000;
var describeTimeout = 60000;
var QUEUE = 'wrL:hpri'; //Task
var intval = 10; // interval time


describe('Multiple Feature: Processing Status #FOW', function() {
  'use strict';

  var serversToShutDown = [];

  after(function(){
  	dbUtils.exit();
  });

  beforeEach(function (done) {
    dbUtils.cleanDb();
    serversToShutDown = [];
    listener.start(done);
  });

  afterEach(function (done) {

    //Stop created servers
    for (var i = 0; i < serversToShutDown.length; i++) {
      try {
        serversToShutDown[i].close();
      } catch (e) {

      }
    }

    serversToShutDown = [];

    listener.stop(function() {
      consumer.stop(done);
    });
  });

	it('Case 1 Should return the processing state when the task is been processed (QUEUED/PROCESSING/COMPLETED) #FRT ', function(done) {

		var optionsRelay = {};
		var HEADER_NAME = 'test-header', HEADER_VALUE = 'test header 1', PATH = '/testa/testb/testc?a=b&c=d',
				CONTENT = 'TEST CONTENT';

		optionsRelay.host = HOST;
		optionsRelay.port = PORT;
		optionsRelay.path = PATH;
		optionsRelay.headers = {};
		optionsRelay.method = 'POST';
		optionsRelay.headers['content-type'] = 'application/json';
		optionsRelay.headers['X-Relayer-Host'] =  config.simpleServerHostname + ':' + config.simpleServerPort;
		optionsRelay.headers['X-relayer-persistence'] = 'BODY';
		optionsRelay.headers[HEADER_NAME] = HEADER_VALUE;

		//RELAY REQUEST
		utils.makeRequest(optionsRelay, CONTENT, function(err, res) {

			//GET ID
			should.not.exist(err);
			var id = JSON.parse(res).id;

			var optionsRetrieve = { port: PORT, host: HOST, path: '/response/' + id, method: 'GET'};

			//First attempt: Get STATUS === QUEUED
			//Consumer has not been started yet
			utils.makeRequest(optionsRetrieve, null, function (err, data, res) {

				should.not.exist(err);
				res.statusCode.should.be.equal(200);

				var JSONRes = JSON.parse(data);
				if(vm){console.log(data);}
				JSONRes.should.have.property('state', 'queued');
				JSONRes.should.have.property('id', id);

				//Start up the server. Consumer is started when server is up
				var srv = http.createServer(function(req, res) {

					var content = '', headers = req.headers, method = req.method, url = req.url;

					req.on('data', function(chunk) {
						content += chunk;
					});

					req.on('end', function() {

						//Second attempt: Get STATUS === PROCESSING
						//Consumer and server have been started but server hasn't sent the response
						utils.makeRequest(optionsRetrieve, null, function (err, data, resRetrieve) {

							should.not.exist(err);
							resRetrieve.statusCode.should.be.equal(200);

							var JSONRes = JSON.parse(data);
							JSONRes.should.have.property('state', 'processing');
							if(vm){console.log(data);}
							JSONRes.should.have.property('id', id);

							res.writeHead(200, headers);
							res.end(content);

							//Third attempt: Get STATUS === COMPLETED
							//Consumer and server have been started and server has sent the response.
							//Interval is needed because redis can take time to store the new state.
							var checked;
							var interval = setInterval(function() {

								function checkResponse(err, data, res) {

									var JSONres = JSON.parse(data);
									if(vm){console.log(data);}
									if (!checked && res.statusCode !== 404 && JSONres.state === 'completed') {

										clearInterval(interval);

										JSONRes.should.have.property('id', id);
										JSONres.should.have.property('body', CONTENT);
										JSONres.body.should.be.equal(content);
										JSONres.headers.should.have.property(HEADER_NAME, HEADER_VALUE);
										JSONres.should.have.property('statusCode', '200');

										checked = true;
										done();

									}
								}

								utils.makeRequest(optionsRetrieve, '', checkResponse);
							}, intval);

						});
					});

				}).listen(config.simpleServerPort, consumer.start); //Consumer can be started when server is running

				serversToShutDown.push(srv);

			});

		});
	});

	it('Case 2 Processing state is not returned if X-Relayer-Persistence is not defined (QUEUED/COMPLETED) #FPT ', function(done) {

		var optionsRelay = {};
		var HEADER_NAME = 'test-header', HEADER_VALUE = 'test header 1', PATH = '/testa/testb/testc?a=b&c=d',
				CONTENT = 'TEST CONTENT';

		optionsRelay.host = HOST;
		optionsRelay.port = PORT;
		optionsRelay.path = PATH;
		optionsRelay.headers = {};
		optionsRelay.method = 'POST';
		optionsRelay.headers['content-type'] = 'application/json';
		optionsRelay.headers['X-Relayer-Host'] =  'noexiste.com';
		optionsRelay.headers[HEADER_NAME] = HEADER_VALUE;

		//RELAY REQUEST
		utils.makeRequest(optionsRelay, CONTENT, function(err, res) {

			//GET ID
			should.not.exist(err);
			var id = JSON.parse(res).id;

			var optionsRetrieve = { port: PORT, host: HOST, path: '/response/' + id, method: 'GET'};

			//404 ERROR because X-Relayer-Persistence was not defined when the relay request was sent
			utils.makeRequest(optionsRetrieve, null, function (err, data, res) {

				should.not.exist(err);
				//res.should.have.property('statusCode', 404);

				var JSONres = JSON.parse(data);
				if(vm){console.log(data);}
				JSONres.should.have.property('exceptionId','SVC1006');
				JSONres.should.have.property('exceptionText', 'Resource ' + id + ' does not exist');

				//Consumer should be started to remove the task from the queue
				done();

			});
		});
	});


});
