var globals = require('./launcherGlobals').globals;
var workerObject;

process.on('message', function(message){

  switch(message){

    case globals.CONSUMER :
      workerObject = require('../lib/consumer.js');
      break;

    case globals.LISTENER :
      workerObject = require('../lib/listener.js');
      break;

    case globals.START :
      workerObject.start(function(err){
        if (!err)
          process.send(globals.START_OK);
      });
      break;

    case globals.STOP :
      workerObject.stop(function(){
        process.send(globals.STOP_OK);
      });
  }
});

process.on('exit', function(){
  console.log("CERRADO");
})