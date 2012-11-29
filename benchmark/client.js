var http=require ('http');
var request='test';

var client =function (RushHost,RushPort,HostAndPort,timeout,resSize){
var options={};
options.host = RushHost;
options.port = Rushport;
options.headers = {};
options.headers['X-Relayer-Host'] = HostAndPort;
//options.headers['X-relayer-persistence'] = 'BODY';
options.method='POST';

var req = http.request(options, function (res) {

         res.on('data',function(chunk){
             var data='';
             data+=chunk;
             console.log(data);
         });
});

var body={ timeout :timeout, resSize :resSize};
body=JSON.stringify(body);
req.write(body);
req.end();
}

exports.client = client;
