var path = require('path');
var fork = require('child_process').fork;

var child;

exports.start = function(done){
  child = fork(__dirname + '/workerLauncher.js');
  child.send('consumer');
  child.send('start');
  child.on('message', function onStart(message){
    if(message === 'STARTOK'){
      if (done) done();
      console.log("CONSUMER START");
      child.removeListener('message', onStart);
    }
  });

  process.on('exit', function() {
    console.log('about to kill');
    //child.kill();
  });
}

exports.stop = function(done){
  if(!child) return done();
  child.send('stop');
  child.on('message', function onStope(message){
    if(message === 'STOPOK'){
      child.kill();
      child.removeListener('message', onStope);
      done();
      console.log("CONSUMER STOP");
    }
  });
}


