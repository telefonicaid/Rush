var fs = require('fs');

var stream = fs.createWriteStream(process.argv[2], {flags : 'a'});

process.stdin.allowHalfOpen = true;
process.stdin.pipe(stream);
