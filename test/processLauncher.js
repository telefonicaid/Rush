var path = require('path');
var fork = require('child_process').fork;
var globals = require('./launcherGlobals').globals;

var processLauncher = function(processName) {

  var child;
  var processName = processName;

  this.start = function(done) {

    child = fork(__dirname + '/workerLauncher.js');
    child.send(processName);
    child.send(globals.START);
    child.on('message', function onStart(message){
      if(message === globals.START_OK){
        if (done) done();
        child.removeListener('message', onStart);
      }
    });

    process.on('exit', function() {
      child.kill();
    });


  }

  this.stop = function(done) {

    if(!child) done();

    child.send(globals.STOP);
    child.on('message', function onStop(message){
      if(message === globals.STOP_OK){
        child.kill();
        child.removeListener('message', onStop);
        if (done) done();
      }
    });
  }
};

exports.processLauncher = processLauncher;
exports.listenerLauncher = processLauncher.bind(this, globals.LISTENER);
exports.consumerLauncher = processLauncher.bind(this, globals.CONSUMER);

