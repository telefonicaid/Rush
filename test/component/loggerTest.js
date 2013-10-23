var path = require('path');
var util = require('util');
var os = require("os");
var fs = require('fs');
var should = require('should');

var LOGNAME = 'pditclogger.log';

var swapLoggerOnce = function(callback){
  var oldLogger = console.log;


  var endOnNoLog = setTimeout(function(){
    console.log = oldLogger;
    callback(null);
  }, 200);

  console.log = function(){
    var received = Array.prototype.slice.call(arguments);
    console.log = oldLogger;
    clearTimeout(endOnNoLog);
    callback(received[0]);
  }

}

function _validScenario(data){
  it(data.name, function(done){

    var checked = 0;

    var fd = fs.openSync(LOGNAME, 'w+');
    swapLoggerOnce(function(logConsole){
      logConsole.should.include(data.expected);
      checked++;
      if(checked == 2){
        done();
      }
    });
    data.log();
    fs.closeSync(fd);
    setTimeout(function(){
      var read = fs.readFileSync(LOGNAME, 'utf8');
      read.should.include(data.expected);
      checked++;
      if(checked == 2){
        done();
      }
    }, 100);
  })

}

function _invalidScenario(data){
    it(data.name, function(done){

      var checked = 0;

      var fd = fs.openSync(LOGNAME, 'w+');
      swapLoggerOnce(function(logConsole){
        should.not.exist(logConsole);
        checked++;
        if(checked == 2){
          done();
        }
      });
      fs.closeSync(fd);

      setTimeout(function(){
        var read = fs.readFileSync(LOGNAME, 'utf8');
        read.should.be.equal('');
        checked++;
        if(checked == 2){
          done();
        }
      }, 200);
    });

}

describe('Logs component test', function () {

  describe('All log levels', function () {

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

    var dataSet = [{
                    log : logger.info.bind(null, 'Test', {op: 'CONSUME'}),
                    expected : "| lvl=INFO | op=CONSUME | msg=Test | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest",
                    name : "1 Should log CONSUME option (info)"
                  },
                  {
                    log : logger.info.bind(null, 'Test', {}),
                    expected : "| lvl=INFO | op=DEFAULT | msg=Test | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest",
                    name : "2 Should log DEFAULT option (info)"
                  },
                  {
                    log : logger.info.bind(null, null, {}),
                    expected : "| lvl=INFO | op=DEFAULT | msg=null | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest",
                    name : "3 Should log msg null (info)"
                  },
                  {
                    log : logger.info.bind(null, 'Test', {correlator : 'test'}),
                    expected : "| lvl=INFO | op=DEFAULT | msg=Test | corr=test | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest",
                    name : "4 Should log correlator  (info)"
                  },
                  {
                    log : logger.info.bind(null, 'Test', {transid : 'test'}),
                    expected : "| lvl=INFO | op=DEFAULT | msg=Test | corr=N/A | trans=test | hostname=" + os.hostname() + " | component=loggerTest",
                    name : "5 Should log transaction id (info)"
                  },
                  {
                    log : logger.info.bind(null, 'Test', {transid : 'test', correlator : 'test'}),
                    expected : "| lvl=INFO | op=DEFAULT | msg=Test | corr=test | trans=test | hostname=" + os.hostname() + " | component=loggerTest",
                    name : "6 Should log correlator and transaction id  (info)"
                  },
                  {
                    log : logger.info.bind(null, 'Test', {component : "other"}),
                    expected : "| lvl=INFO | op=DEFAULT | msg=Test | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=other",
                    name : "7 Should log component when changed (info)"
                  },
                  {
                    log : logger.info.bind(null, 'Test', {newTag : "test"}),
                    expected : "| lvl=INFO | op=DEFAULT | msg=Test | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest | newTag=\'test\'",
                    name : "8 Should log any other information required  (info)"
                  },
                  {
                    log : logger.error.bind(null, 'Test', {}),
                    expected : "| lvl=ERROR | op=DEFAULT | msg=Test | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest",
                    name : "9 Should log lvl ERROR  (info)"
                  },
                  {
                    log : logger.emerg.bind(null, 'Test', {}),
                    expected : "| lvl=EMERG | op=DEFAULT | msg=Test | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest",
                    name : "10 Should log lvl EMERG  (info)"
                  },
                  {
                    log : logger.warning.bind(null, 'Test', {}),
                    expected : "| lvl=WARN | op=DEFAULT | msg=Test | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest",
                    name : "11 Should log lvl WARN  (info)"
                  },
                  {
                    log : logger.warn.bind(null, 'Test', {}),
                    expected : "| lvl=WARN | op=DEFAULT | msg=Test | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest",
                    name : "11 Should log lvl WARN  (info)"
                  },
                  {
                    log : logger.debug.bind(null, 'Test', {}),
                    expected : "| lvl=DEBUG | op=DEFAULT | msg=Test | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest",
                    name : "12 Should log lvl DEBUG  (info)"
                  }
                  ]

    for(var i=0; i<dataSet.length; i++){
      _validScenario(dataSet[i]);
    }
  });

  describe('FORCE behaviour', function(){

    var log = require('../../lib/logger/logger');

    var config = {
      Console: {level : 'error'},
      File: {level : 'error'}
    }
    log.setConfig(config);
    var logger = log.newLogger();
    logger.prefix = path.basename(module.filename, '.js');
    var test = {
      log : logger.warn.bind(null, 'Test', {op: 'CONSUME'}),
      name : "1 Should not log warning with an error log level"
    }
    _invalidScenario(test);
    test = {
      log : logger.warn.bind(null, 'Test', {op: 'CONSUME', force : true}),
      expected : "| lvl=WARN | op=CONSUME | msg=Test | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest",
      name : "2 Should log warning with an error log level (force : true);"
    }
    _validScenario(test);


    var config = {
      Console: {level : 'warning'},
      File: {level : 'warning'}
    }
    log.setConfig(config);
    var logger = log.newLogger();
    logger.prefix = path.basename(module.filename, '.js');
    var test = {
      log : logger.info.bind(null, 'Test', {op: 'CONSUME'}),
      name : "3 Should not log info with a warning log level"
    }
    _invalidScenario(test);
    test = {
      log : logger.info.bind(null, 'Test', {op: 'CONSUME', force : true}),
      expected : "| lvl=INFO | op=CONSUME | msg=Test | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest",
      name : "4 Should log info with a warning log level (force : true);"
    }
    _validScenario(test);


    var config = {
      Console: {level : 'info'},
      File: {level : 'info'}
    }
    log.setConfig(config);
    var logger = log.newLogger();
    logger.prefix = path.basename(module.filename, '.js');
    var test = {
      log : logger.debug.bind(null, 'Test', {op: 'CONSUME'}),
      name : "5 Should not log debug with an info log level"
    }
    _invalidScenario(test);
    test = {
      log : logger.debug.bind(null, 'Test', {op: 'CONSUME', force : true}),
      expected : "| lvl=DEBUG | op=CONSUME | msg=Test | corr=N/A | trans=N/A | hostname=" + os.hostname() + " | component=loggerTest",
      name : "6 Should log debug with an info log level (force : true);"
    }
    _validScenario(test);



  });
});
