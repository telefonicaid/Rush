var http = require('http');
var chai = require('chai');
var expect = chai.expect;
var should = require('should');
var config = require('./config.js');
var utils = require('./utils.js');
var dbUtils = require('../dbUtils.js');


var consumer = require('../consumerLauncher.js');
var listener = require('../listenerLauncher.js');

var HOST = config.rushServer.hostname;
var PORT = config.rushServer.port;

var serversToShutDown = [];
var timeout = 60000;
var describeTimeout= timeout*10;

//verbose mode
var vm = false;

//DISCLAIMER All this tests are based on a properly set of 3 attempts in configBase


function runTest(retryTimes, petitionCorrect, serverTimes, done) {
  'use strict';

  var CONTENT = 'Retry Test',
      APPLICATION_CONTENT = 'application/json',
      RELAYER_HOST =  config.simpleServerHostname + ':' + config.simpleServerPort,
      PERSONAL_HEADER_1_NAME = 'personal-header-1',
      PERSONAL_HEADER_1_VALUE = 'TEST1',
      PERSONAL_HEADER_2_NAME = 'personal-header-2',
      PERSONAL_HEADER_2_VALUE = 'TEST2',
      petitionsReceived = 0,
      srv;

  function makeRequest(retryTimes) {

    //Petition method
    var options = {};
    options.host = HOST;
    options.port = PORT;
    options.method = 'POST';
    options.headers = {};
    options.headers['content-type'] = APPLICATION_CONTENT;
    options.headers['X-Relayer-Host'] = RELAYER_HOST;
    options.headers['X-relayer-retry'] = retryTimes;
	  options.headers['X-relayer-persistence'] = 'STATUS';
    options.headers[PERSONAL_HEADER_1_NAME] = PERSONAL_HEADER_1_VALUE;
    options.headers[PERSONAL_HEADER_2_NAME] = PERSONAL_HEADER_2_VALUE;

    utils.makeRequest(options, CONTENT, function(e, data) {
	      //console.log(options);
	     if(vm){console.log(data);}
    });
  }

  srv = http.createServer(function(req, res) {

    var headers = req.headers,
        method = req.method,
        contentReceived = '';

    req.on('data', function(chunk) {
      contentReceived += chunk;
    });

    req.on('end', function() {
	     //console.log(req.headers);
      petitionsReceived += 1;

      if (petitionsReceived === petitionCorrect) {
        res.writeHead(200, headers);
	      if(vm){console.log('  ✓ Request Accepted #' + petitionsReceived);}
      } else {
        res.writeHead(500, headers);
	      if(vm){console.log('  x Request Rejected #' + petitionsReceived);}
      }

      res.end(contentReceived);
      req.destroy();

      //Test petition
      method.should.be.equal('POST');
      headers['content-type'].should.be.equal(APPLICATION_CONTENT);
      contentReceived.should.be.equal(CONTENT);

      if (petitionsReceived === serverTimes) {
        srv.close();
        done();
      }
    });
  }).listen(config.simpleServerPort, makeRequest.bind({}, retryTimes));

  serversToShutDown.push(srv);
}

function _invalidScenario(retryTimes, exceptionId, exceptionText, userMessage, done) {
	'use strict';

	var CONTENT = 'Retry Test',
			APPLICATION_CONTENT = 'application/json',
			RELAYER_HOST =  config.simpleServerHostname + ':' + config.simpleServerPort,
			petitionsReceived = 0,
			srv;

	function makeRequest() {

		//Petition method
		var options = {};
		options.host = HOST;
		options.port = PORT;
		options.method = 'POST';
		options.headers = {};
		options.headers['content-type'] = APPLICATION_CONTENT;
		options.headers['X-Relayer-Host'] = RELAYER_HOST;
		options.headers['X-relayer-retry'] = retryTimes;
		options.headers['X-relayer-persistence'] = 'STATUS';

		utils.makeRequest(options, CONTENT, function(err, res) {
				//console.log(options);
			if(vm){console.log(res);}
				// Checks. Once request has been responsed
			expect(err).to.not.exist;
			var parsedRes = JSON.parse(res);
			expect(parsedRes.exceptionId).to.eql(exceptionId);
			expect(parsedRes.exceptionText).to.eql(exceptionText);
			expect(parsedRes.userMessage).to.eql(userMessage);
			done();
		});
	}

	makeRequest({}, retryTimes);

	serversToShutDown.push(srv);
	//done();
}

describe('Single Feature: Retry #FRT', function() {
  this.timeout(describeTimeout);
	'use strict';

  before(function (done) {
    listener.start(function() {
      consumer.start(done);
    });
  });

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
      } catch (e) {

      }
    }
     serversToShutDown = [];
  });

  beforeEach(function(){
    dbUtils.cleanDb();
  });


	describe('Valid Scenarios', function() {
		this.timeout(describeTimeout);

	  it('Case 1 Request with 3 retries should be accepted the 4th attempt #FRT', function(done) {
	    this.timeout(timeout);
	    var retryTimes = 3,
	        petitionCorrect = retryTimes + 1,
	        serverTimes = retryTimes + 1;     //Three retries + the initial request

	    runTest(retryTimes, petitionCorrect, serverTimes, done);
	  });

	  it('Case 2 Request with 3 retries should be accepted the 3rd attempt #FRT', function(done) {
      this.timeout(timeout);
      var retryTimes = 3,
	        petitionCorrect = retryTimes,
	        serverTimes = retryTimes;       //Two retries + the initial request

	    runTest(retryTimes, petitionCorrect, serverTimes, done);
	  });

		it('Case 3 Request with 3 retries should NOT be accepted #FRT', function(done) {
      this.timeout(timeout);
      var retryTimes = 3,
					petitionCorrect = retryTimes + 2,
					serverTimes = retryTimes + 1;     //Three retries + the initial request
			//Server won't be called again even if the last retry fails

			runTest(retryTimes, petitionCorrect, serverTimes, done);
		});

		it('Case 4 Request with 2 retries should be accepted the 3 attempt #FRT', function(done) {
      this.timeout(timeout);
      var retryTimes = 2,
					petitionCorrect = retryTimes + 1,
					serverTimes = retryTimes + 1;     //Three retries + the initial request
			//Server won't be called again even if the last retry fails

			runTest(retryTimes, petitionCorrect, serverTimes, done);
		});

		it('Case 5 Request with 1 retry should be accepted the 2 attempt #FRT', function(done) {
     	this.timeout(timeout);
			var retryTimes = 1,
					petitionCorrect = retryTimes + 1,
					serverTimes = retryTimes + 1;


			runTest(retryTimes, petitionCorrect, serverTimes, done);
		});

		it('Case 6 Request with 0 retries should NOT be accepted the 1 attempt #FRT', function(done) {
			this.timeout(timeout);
			var retryTimes = 0,
					petitionCorrect = retryTimes + 2,
					serverTimes = retryTimes + 1; //with 0 retries should not retry


			runTest(retryTimes, petitionCorrect, serverTimes, done);
		});

		it('Case 7 Request with 100 retries should be accepted as valid request and try to resend it until there were available buckets #FRT', function(done) {
      this.timeout(timeout);
			var retryTimes = 100,
					petitionCorrect = 4,
					serverTimes = 4;

			runTest(retryTimes, petitionCorrect, serverTimes, done);
		});

		it('Case 8 Request with 100 retries should be accepted as valid request and try to resende until retries available #FRT', function(done) {
      this.timeout(timeout);
      var retryTimes = 100,
					petitionCorrect = 4,
					serverTimes = 4;

			runTest(retryTimes, petitionCorrect, serverTimes, done);
		});

		it('Case 9 Request with \'\' empty retries should be accepted the 1 attempt #FRT', function(done) {
      this.timeout(timeout);
      var retryTimes = '',
					petitionCorrect = 2,
					serverTimes = 1;

			runTest(retryTimes, petitionCorrect, serverTimes, done);
		});

	});

	describe('Invalid Scenarios', function() {
				  this.timeout(describeTimeout);

		it('Case 1 Request with \'AAA\' retries should NOT be accepted as valid request #FRT', function(done) {

			this.timeout(timeout);

			var retryTimes = 'AAA',
					petitionCorrect = retryTimes + 2,
					serverTimes = retryTimes + 1;

			var exceptionId = 'SVC0002';
			var exceptionText = 'Invalid parameter value: x-relayer-retry';
			var userMessage = 'Invalid retry value: '+ retryTimes;

			_invalidScenario(retryTimes, exceptionId, exceptionText, userMessage, done);
		});

		it('Case 2 Request with \'%\' retries should be accepted the X attempt #FRT', function(done) {

			this.timeout(timeout);

			var retryTimes = '%',
					petitionCorrect = 0,
					serverTimes = 0;


			var exceptionId = 'SVC0002';
			var exceptionText = 'Invalid parameter value: x-relayer-retry';
			var userMessage = 'Invalid retry value: '+ retryTimes;


			_invalidScenario(retryTimes, exceptionId, exceptionText, userMessage, done);
		});


		it('Case 3 Request with \'-1\' retries should be accepted the X attempt #FRT', function(done) {

			this.timeout(timeout);

			var retryTimes = -1,
					petitionCorrect = 0,
					serverTimes = 0;

			var exceptionId = 'SVC0002';
			var exceptionText = 'Invalid parameter value: x-relayer-retry';
			var userMessage = 'Invalid retry value: '+ retryTimes + '. Retry value should be a natural number.';

			_invalidScenario(retryTimes, exceptionId, exceptionText, userMessage, done);
		});

	});


});
