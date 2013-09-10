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

var serversToShutDown = [];

function _validScenario(data){
	it.skip(data.name +  ' #FHA', function(done){
		var agent = superagent.agent();
		var id;
    if (vm) {
	    //Steps input
    }

	});
}


describe('Single Feature: High Availability '  + '#FHA', function() {
	this.timeout(describeTimeout);

		serversToShutDown = [];
	});




	describe('Scenario HA AWS Standard [ 1LoadBalancer (LB) | 2Rush-Listeners(RL1,RL2) + 2Rush-Consumers(RC1,RC2) | 2Sentinel(S1,S2) + 2Redis (R1,R2) ]', function () {
		describe(' Tolerance to errors', function () {

		var dataSetPOST = [
			{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
					"1 Should accept requests when server X is down"},
		];

		for(i=0; i < dataSetPOST.length; i++){
			_validScenario(dataSetPOST[i]);  //Launch every test in data set
		}
		});

		describe(' NO Tolerance to errors', function () {

			var dataSetPOST = [
				{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
						"1 Should NOT accept requests when X is down"},
			];

			for(i=0; i < dataSetPOST.length; i++){
				_validScenario(dataSetPOST[i]);  //Launch every test in data set
			}
		});


	});



