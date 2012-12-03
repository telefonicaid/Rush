var http = require('http');

var createServer = function(timeout, resSize, connectionCb){
    http.createServer(function(req, res){

        req.on('end',function(data){
            setTimeout(function(){
                res.write(genResponseData(resSize), 'utf8');
                res.end();
             },timeout);
        });

    }).listen(8091, connectionCb);
};

var genResponseData = function (size) {

    var string_length = size;

    var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
    var randomstring = '';

    for (var i = 0; i < string_length; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        randomstring += chars.substring(rnum, rnum + 1);
    }
    return randomstring;
};

exports.createServer = createServer;