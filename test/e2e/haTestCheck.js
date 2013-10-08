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
	it.skip('Case ' + data.name +  ' #FHA', function(done){
		var agent = superagent.agent();
		var id;
    if (vm) {
	    //Steps input
    }

	});
}

function _invalidScenario(data){
	it.skip('Case ' + data.name +  ' #FHA', function(done){
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
					"1 Should accept requests when S1 is down, delegating monitorization to Sentinel2"},
			{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
					"2 Should accept requests when S2 is down, Sentinel detects S2 as down"},
			{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
					"3 Should accept requests when S1 and S2 is down, HA monitorization is lost"},
			{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
					"4 Should accept requests when server R1 is down, some requests may be lost. Delegating storage to R2."},
			{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
					"5 Should accept requests when server R2 is down, Sentinel detects R2 as down. No slaves to promote"},
			{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
					"7 Should accept requests when RL1 is down. Only one listener left"},
			{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
					"8 Should accept requests when RL2 is down. Only one listener left"},
			{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
					"9 Should accept requests when RC1 is down. Only one consumer left"},
			{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
					"10 Should accept requests when RC2 is down. Only one consumer left"}

		];

		for(i=0; i < dataSetPOST.length; i++){
			_validScenario(dataSetPOST[i]);  //Launch every test in data set
		}
		});

		describe(' NO Tolerance to errors', function () {

			var dataSetPOST = [
				{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
						"1 Should NOT accept requests when LB is down. Workers are still completing enqueued requests."},
				{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
						"2 Should NOT accept requests when R1 and R2 are down. No storage servers left"},
				{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
						"3 Should NOT accept requests when RL1 and RL2 are down. Workers are still completing enqueued requests."},
				{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
						"4 Should NOT accept requests when RC1 and RC2 are down. Rush requests can be enqueued, but not served"},
				{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
						"5 Should NOT accept requests when S1, S2, and R1 are down. No way to promote slaves"},
				{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
						"6 Should NOT accept requests when S1, S2, and R2 are down. No way to promote slaves"}
			];

			for(i=0; i < dataSetPOST.length; i++){
				_invalidScenario(dataSetPOST[i]);  //Launch every test in data set
			}
		});


	});

	describe(' Scenario HA AWS BIG [ 1LoadBalancerAWS  (AWSLB1)| 2LoadBalancer (LB1,LB2) | 2Rush-Listeners(RL1,RL2) + 2Rush-Consumers(RC1,RC2) | 2Sentinel(S1,S2) + 2Redis (R1,R2) ]', function () {

		describe(' Tolerance to errors', function () {
		var dataSetPOST = [
			{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
					"1 Should accept requests when S1 is down, delegating monitorization to Sentinel2"},
			{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
					"2 Should accept requests when S2 is down, Sentinel detects S2 as down"},
			{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
					"1 Should accept requests when S1 is down, delegating monitorization to Sentinel2"},
			{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
					"2 Should accept requests when S2 is down, Sentinel detects S2 as down"},
			{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
					"3 Should accept requests when S1 and S2 is down, HA monitorization is lost"},
			{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
					"4 Should accept requests when server R1 is down, some requests may be lost. Delegating storage to R2."},
			{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
					"5 Should accept requests when server R2 is down, Sentinel detects R2 as down. No slaves to promote"},
			{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
					"7 Should accept requests when RL1 is down. Only one listener left"},
			{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
					"8 Should accept requests when RL2 is down. Only one listener left"},
			{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
					"9 Should accept requests when RC1 is down. Only one consumer left"},
			{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
					"10 Should accept requests when RC2 is down. Only one consumer left"},
			{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
					"11 Should accept requests when LB1 is down, AWSLB1 distributes ALL petitions to LB2"},
			{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
					"12 Should accept requests when LB2 is down, AWSLB1 distributes ALL petitions to LB1"}
		];

		for(i=0; i < dataSetPOST.length; i++){
			_validScenario(dataSetPOST[i]);  //Launch every test in data set
		}
		});

		describe(' NO Tolerance to errors', function () {

			var dataSetPOST = [
				{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
						"1 Should NOT accept requests when AWSLB1 is down. Workers are still completing enqueued requests."},
				{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
						"2 Should NOT accept requests when LB1 and LB2 are down. Workers are still completing enqueued requests."},
				{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
						"3 Should NOT accept requests when R1 and R2 are down. No storage servers left"},
				{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
						"4 Should NOT accept requests when RL1 and RL2 are down. Workers are still completing enqueued requests."},
				{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
						"5 Should NOT accept requests when RC1 and RC2 are down. Rush requests can be enqueued, but not served"},
				{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
						"6 Should NOT accept requests when S1, S2, and R1 are down. No way to promote slaves"},
				{protocol : 'http', method: 'GET', path: '/', headers: {}, body: {}, name :
						"7 Should NOT accept requests when S1, S2, and R2 are down. No way to promote slaves"}
			];

			for(i=0; i < dataSetPOST.length; i++){
				_invalidScenario(dataSetPOST[i]);  //Launch every test in data set
			}
		});


	});





