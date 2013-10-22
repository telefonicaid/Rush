var log = require('../../lib/logger/logger');
var logger = log.newLogger();
var path = require('path');
var util = require('util');
logger.prefix = path.basename(module.filename, '.js');
var os = require("os");
var fs = require('fs');
var should = require('should');

var LOGNAME = 'pditclogger.log';

var swapLoggerOnce = function(callback){
  var oldLogger = console.log;

  console.log = function(){
    var received = Array.prototype.slice.call(arguments);
    console.log = oldLogger;
    callback(received[0]);
  }
}

function _scenario(data){
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

describe('Logs component test', function () {

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
    _scenario(dataSet[i]);
  }
});
