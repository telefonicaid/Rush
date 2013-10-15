var fs = require('fs');

var stream = fs.createWriteStream(process.argv[2], {flags : 'a'});

process.on('uncaughtException', function(err) {
  process.send(err);
});

process.stdin.allowHalfOpen = true;
process.stdin.pipe(stream);
