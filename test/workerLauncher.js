var workerObject;

process.on('message', function(message){
  switch(message){
    case 'consumer' :
      workerObject = require('../lib/consumer.js');
      break;
    case 'listener' :
      workerObject = require('../lib/listener.js');
      break;
    case 'start' :
      workerObject.start(function(){
        process.send('STARTOK');
      });
      break;
    case 'stop' :
      workerObject.stop(function(){
        process.send('STOPOK');
      });
  }
});
