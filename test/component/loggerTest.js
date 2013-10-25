var path = require('path');
var util = require('util');
var os = require("os");
var fs = require('fs');
var should = require('should');

var LOGNAME = 'pditclogger.log';
var WEIRDSTRING = '1234567890__________________________¿?=)(/&%$·"!!"·$%&/()=?Hello World¿?=)(/&%$·"!!"·$%&/()=';

var timeout = 200;
var timeoutDescribe = 2000;

//verbose mode
var vm = false;

/*
* TODO
* - Add comments to the what functions are expected for
* */

var swapLoggerOnce = function(callback){
  var oldLogger = console.log;


  var endOnNoLog = setTimeout(function(){  //Waits until some log is witten. If not, returns. Usefull when no log is written at all.
    console.log = oldLogger;
    callback(null);
  }, timeout);

  console.log = function(){
    var received = Array.prototype.slice.call(arguments);
    console.log = oldLogger; //returns to the actual logger
    clearTimeout(endOnNoLog); //prevents setTimeout callback.
    callback(received[0]);
  }

}

function _validScenario(data){
  it(data.name + ' #CT', function(done){
	  var checked = 0;
    var fd = fs.openSync(LOGNAME, 'w+'); //Opens a the log file and truncates. fs.truncate changes its behaviour between 0.8 and 0.10
    swapLoggerOnce(function(logConsole){ //bypass log and wait for response
	    if(vm){console.log(logConsole);}
      logConsole.should.include(data.expected);
      checked++;
      if(checked == 2){ //Waits till file and console tranport are checked.
        done();
      }
    });
    data.log();
    fs.closeSync(fd);
    setTimeout(function(){
      var read = fs.readFileSync(LOGNAME, 'utf8'); //Checks file transport
      read.should.include(data.expected);
      checked++;
      if(checked == 2){
        done();
      }
    }, timeout/2);
  })

}

function _invalidScenario(data){
    it(data.name + ' #CT', function(done){

      var checked = 0;

      var fd = fs.openSync(LOGNAME, 'w+');
      swapLoggerOnce(function(logConsole){
	      if(vm){console.log(logConsole);}
        should.not.exist(logConsole); //Waits for a log and expect it to be empty
        checked++;
        if(checked == 2){
          done();
        }
      });
      fs.closeSync(fd);

      setTimeout(function(){
        var read = fs.readFileSync(LOGNAME, 'utf8');
        read.should.be.equal('');  //Reads the file and expect it to be empty
        checked++;
        if(checked == 2){
          done();
        }
      }, 200);
    });

}

describe('Component Test: Logs ', function () {
	this.timeout(timeoutDescribe);
  describe('Valid log Scenarios with different log level', function () {

    var log = require('../../lib/logger/logger');

    var config = {

      loglevel : 'debug',

      Console: {
        level : 'debug',
        timestamp: true
      },
      File: {
        level : 'debug',
        filename: 'pditclogger.log',
        timestamp: true,
        rounds : 1000,
        exitOnWriteError: true
      }
    }

    log.setConfig(config);

    var logger = log.newLogger();
    logger.prefix = path.basename(module.filename, '.js');

    var dataSet =
		    [{    //info
			    log : logger.info.bind(null, 'Test', {op: 'CONSUME'}),
          expected : "| lvl=INFO | op=CONSUME | msg=Test | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest",
          name : "Case 1 Should log CONSUME option (info)"
        },
        {
          log : logger.info.bind(null, 'Test', {}),
          expected : "| lvl=INFO | op=N/A | msg=Test | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest",
          name : "Case 2 Should log DEFAULT option (info)"
        },
        {
          log : logger.info.bind(null, null, {}),
          expected : "| lvl=INFO | op=N/A | msg=N/A | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest",
          name : "Case 3 Should log msg N/A (info)"
        },
        {
          log : logger.info.bind(null, 'Test', {correlator : 'test'}),
          expected : "| lvl=INFO | op=N/A | msg=Test | corr=test | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest",
          name : "Case 4 Should log correlator  (info)"
        },
        {
          log : logger.info.bind(null, 'Test', {transid : 'test'}),
          expected : "| lvl=INFO | op=N/A | msg=Test | corr=N/A | trans=test | hostname=" + os.hostname() + " | component=loggerTest",
          name : "Case 5 Should log transaction id (info)"
        },
        {
          log : logger.info.bind(null, 'Test', {transid : 'test', correlator : 'test'}),
          expected : "| lvl=INFO | op=N/A | msg=Test | corr=test | trans=test | hostname=" + os.hostname() + " | component=loggerTest",
          name : "Case 6 Should log correlation and transaction id  (info)"
        },
        {
          log : logger.info.bind(null, 'Test', {component : "other"}),
          expected : "| lvl=INFO | op=N/A | msg=Test | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=other",
          name : "Case 7 Should log component when changed (info)"
        },
        {
          log : logger.info.bind(null, 'Test', {newTag : "test"}),
          expected : "| lvl=INFO | op=N/A | msg=Test | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest | newTag=\'test\'",
          name : "Case 8 Should log any other information required  (info)"
        },
				  //error
        {
          log : logger.error.bind(null, 'Test', {}),
          expected : "| lvl=ERROR | op=N/A | msg=Test | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest",
          name : "Case 9 Should log lvl ERROR  (info)"
        },
        {
	        //emerg
          log : logger.emerg.bind(null, 'Test', {}),
          expected : "| lvl=EMERG | op=N/A | msg=Test | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest",
          name : "Case 10 Should log lvl EMERG  (info)"
        },
        { //warning
          log : logger.warning.bind(null, 'Test', {}),
          expected : "| lvl=WARN | op=N/A | msg=Test | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest",
          name : "Case 11 Should log lvl WARN  (info)"
        },
        {
	        //warn
          log : logger.warn.bind(null, 'Test', {}),
          expected : "| lvl=WARN | op=N/A | msg=Test | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest",
          name : "Case 12 Should log lvl WARN  (info)"
        },
		    {
			    //debug
			    log : logger.debug.bind(null, 'Test', {}),
			    expected : "| lvl=DEBUG | op=N/A | msg=Test | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest",
			    name : "Case 13 Should log lvl DEBUG  (info)"
		    }
        ]

    for(var i=0; i<dataSet.length; i++){
      _validScenario(dataSet[i]);
    }
  });

  describe('Invalid scenarios and forced logs', function(){

    var log = require('../../lib/logger/logger');

    var config = {
      Console: {level : 'error'},
      File: {level : 'error'}
    }
    log.setConfig(config);
    var logger = log.newLogger();
    logger.prefix = path.basename(module.filename, '.js');
    var test =
	    {
	      log : logger.warn.bind(null, 'Test', {op: 'CONSUME'}),
	      name : "Case 1 Should not log warning with an error log level"
	    }
    _invalidScenario(test);

    test =
	    {
	      log : logger.warn.bind(null, 'Test', {op: 'CONSUME', force : true}),
	      expected : "| lvl=WARN | op=CONSUME | msg=Test | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest",
	      name : "Case 2 Should log warning with an error log level (force : true);"
	    }
    _validScenario(test);

    var config =
    {
      Console: {level : 'warning'},
      File: {level : 'warning'}
    }
    log.setConfig(config);
    var logger = log.newLogger();
    logger.prefix = path.basename(module.filename, '.js');
    var test =
	    {
	      log : logger.info.bind(null, 'Test', {op: 'CONSUME'}),
	      name : "Case 3 Should not log info with a warning log level"
	    }
    _invalidScenario(test);

    test =
	    {
	      log : logger.info.bind(null, 'Test', {op: 'CONSUME', force : true}),
	      expected : "| lvl=INFO | op=CONSUME | msg=Test | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest",
	      name : "Case 4 Should log info with a warning log level (force : true);"
	    }
    _validScenario(test);


    var config =
	    {
	      Console: {level : 'info'},
	      File: {level : 'info'}
	    }
    log.setConfig(config);
    var logger = log.newLogger();
    logger.prefix = path.basename(module.filename, '.js');
    var test =
	    {
	      log : logger.debug.bind(null, 'Test', {op: 'CONSUME'}),
	      name : "Case 5 Should not log debug with an info log level"
	    }
    _invalidScenario(test);

    test =
	    {
	      log : logger.debug.bind(null, 'Test', {op: 'CONSUME', force : true}),
	      expected : "| lvl=DEBUG | op=CONSUME | msg=Test | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest",
	      name : "Case 6 Should log debug with an info log level (force : true);"
	    }
    _validScenario(test);

	  var config =
	  {
		  Console: {level : 'test'},
		  File: {level : 'test'}
	  }
	  log.setConfig(config);
	  var logger = log.newLogger();
	  logger.prefix = path.basename(module.filename, '.js');
	  var test =
	  {
		  log : logger.debug.bind(null, 'Test', {op: 'CONSUME'}),
		  name : "Case 7 Should not log with a no defined log level"
	  }
	  _invalidScenario(test);

	  test =
	  {
		  log : logger.debug.bind(null, 'Test', {op: 'test1', force : true}),
		  expected : "| lvl=DEBUG | op=test1 | msg=Test | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest",
		  name : "Case 8 Should log debug with OP=test1;"
	  }
	  _validScenario(test);


	  var config =
	  {
		  Console: {level : 'debug'},
		  File: {level : 'debug'}
	  }
	  log.setConfig(config);
	  var logger = log.newLogger();
	  logger.prefix = path.basename(module.filename, '.js');
	  test =
	  {
		  log : logger.debug.bind(null, 'Test', {correlator: '1', force : true}),
		  expected : "| lvl=DEBUG | op=N/A | msg=Test | corr=1 | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest",
		  name : "Case 9 Should log debug with personalized corr=1 ;"
	  }
	  _validScenario(test);    //possible BUG


	  var config =
	  {
		  Console: {level : 'debug'},
		  File: {level : 'debug'}
	  }
	  log.setConfig(config);
	  var logger = log.newLogger();
	  logger.prefix = path.basename(module.filename, '.js');
	  test =
	  {
		  log : logger.debug.bind(null, 'Test', {transid: '1', force : true}),
		  expected : "| lvl=DEBUG | op=N/A | msg=Test | corr=N/A | trans=1 | hostname=" + os.hostname() + " | component=loggerTest",
		  name : "Case 10 Should log debug with personalized trans=1 ;"
	  }
	  _validScenario(test); // to review

	  var config =
	  {
		  Console: {level : ''},
		  File: {level : ''}
	  }
	  log.setConfig(config);
	  var logger = log.newLogger();
	  logger.prefix = path.basename(module.filename, '.js');
	  var test =
	  {
		  log : logger.debug.bind(null, 'Test', {op: 'CONSUME'}),
		  name : "Case 11 Should not log debug with an empty log level"
	  }
	  _invalidScenario(test);
	  test =
	  {
		  log : logger.debug.bind(null, 'Test', {op: 'CONSUME', force : true}),
		  expected : "| lvl=DEBUG | op=CONSUME | msg=Test | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest",
		  name : "Case 12 Should log debug with an info log level (force : true);"
	  }
	  _validScenario(test);

	  var config =
	  {
		  Console: {level : '$$$'},
		  File: {level : '$$$'}
	  }
	  log.setConfig(config);
	  var logger = log.newLogger();
	  logger.prefix = path.basename(module.filename, '.js');
	  var test =
	  {
		  log : logger.debug.bind(null, 'Test', {op: 'CONSUME'}),
		  name : "Case 13 Should not log with an Invalid log level"
	  }
	  _invalidScenario(test);
	  test =
	  {
		  log : logger.debug.bind(null, 'Test', {op: 'CONSUME', force : true}),
		  expected : "| lvl=DEBUG | op=CONSUME | msg=Test | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest",
		  name : "Case 14 Should log debug with an info log level (force : true);"
	  }
	  _validScenario(test);


    var config = {
      Console: {level : 'error'},
      File: {level : 'error'}
    }
    log.setConfig(config);
    var logger = log.newLogger();
    logger.prefix = path.basename(module.filename, '.js');
    var test =
      {
        log : logger.warn.bind(null, WEIRDSTRING, {op: '', correlator : '', transid : '', component : ''}),
        name : "Case 15 Should not log warning with an error log level and extrange characters in msg"
      }
    _invalidScenario(test);

    test =
      {
        log : logger.warn.bind(null, WEIRDSTRING, {force : true, op: '', correlator : '', transid : '', component : ''}),
        expected : "| lvl=WARN | op=N/A | msg=" + WEIRDSTRING +" | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=N/A",
        name : "Case 16 Should log warning with an error log level and extrange characters in msg(force : true);"
      }
    _validScenario(test);

    var config =
    {
      Console: {level : 'warning'},
      File: {level : 'warning'}
    }
    log.setConfig(config);
    var logger = log.newLogger();
    logger.prefix = path.basename(module.filename, '.js');
    var test =
      {
        log : logger.info.bind(null, '', {op: WEIRDSTRING, correlator : '', transid : '', component : ''}),
        name : "Case 17 Should not log info with a warning log level and extrange characters in op"
      }
    _invalidScenario(test);

    test =
      {
        log : logger.info.bind(null, '', {force : true, op: WEIRDSTRING, correlator : '', transid : '', component : ''}),
        expected : "| lvl=INFO | op=" + WEIRDSTRING + " | msg=N/A | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=N/A",
        name : "Case 18 Should log info with a warning log level and extrange characters in op (force : true);"
      }
    _validScenario(test);


    var config =
      {
        Console: {level : 'info'},
        File: {level : 'info'}
      }
    log.setConfig(config);
    var logger = log.newLogger();
    logger.prefix = path.basename(module.filename, '.js');
    var test =
      {
        log : logger.debug.bind(null, WEIRDSTRING, {op: WEIRDSTRING, correlator : WEIRDSTRING, transid : WEIRDSTRING, component : WEIRDSTRING}),
        name : "Case 19 Should not log debug with an info log level and extrange characters in all fields"
      }
    _invalidScenario(test);

    test =
      {
        log : logger.debug.bind(null, WEIRDSTRING, {force : true, op: WEIRDSTRING, correlator : WEIRDSTRING, transid : WEIRDSTRING, component : WEIRDSTRING}),
        expected : "| lvl=DEBUG | op="+ WEIRDSTRING + " | msg="+ WEIRDSTRING + " | corr="+ WEIRDSTRING + " | trans="+ WEIRDSTRING + " | hostname=" + os.hostname() + " | component=" + WEIRDSTRING,
        name : "Case 20 Should log debug with an info log level and extrange characters in all fields(force : true);"
      }
    _validScenario(test);

    test =
      {
        log : logger.debug.bind(null, '', {force : '', op: '', correlator : WEIRDSTRING, transid : '', component : ''}),
        expected : "| lvl=DEBUG | op="+ WEIRDSTRING + " | msg="+ WEIRDSTRING + " | corr="+ WEIRDSTRING + " | trans="+ WEIRDSTRING + " | hostname=" + os.hostname() + " | component=" + WEIRDSTRING,
        name : "Case 21 Should not log debug with an info log level with force = empty"
      }
    _invalidScenario(test);

    test =
      {
        log : logger.debug.bind(null, '', {force : WEIRDSTRING, op: '', correlator : WEIRDSTRING, transid : '', component : ''}),
        expected : "| lvl=DEBUG | op="+ WEIRDSTRING + " | msg="+ WEIRDSTRING + " | corr="+ WEIRDSTRING + " | trans="+ WEIRDSTRING + " | hostname=" + os.hostname() + " | component=" + WEIRDSTRING,
        name : "Case 22 Should not log debug with an info log level and extrage caracters in force;"
      }
    _invalidScenario(test);

    var config =
      {
        Console: {level : 'info'},
        File: {level : 'info'}
      }
    log.setConfig(config);
    var logger = log.newLogger();

    test =
      {
        log : logger.error.bind(null, WEIRDSTRING),
        expected : "| lvl=ERROR | op=N/A | msg=" + WEIRDSTRING +" | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=N/A",
        name : "Case 23 Should log warning with an error log level and extrange characters in msg(force : true);"
      }
    _validScenario(test);

  });

});
