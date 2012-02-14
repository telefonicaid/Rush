//Testing Module For Rush
var LISTENER_HOSTNAME = 'RelayA',
    LISTENER_PORT = '8030';

var http = require('http');
var global = require('../my_globals').C;
var async = require('async');

var     server,
        end_point_req,
        end_point_res,
        client_res,
        client_req,
        relayer_header={},
        options;



var oneway =  function (method) {
    return function(callback){

    console.log('\nONEWAY TEST FOR METHOD '+method);
    //Create EndPoint server
    server = http.createServer(
        function (req, res) {
            exports.end_point_req = req;

            //verify Server Side
            console.log('Verify Server Side');
            if (req.url=='/testpath'){
                console.log('OK- request URL: '+req.url);
            }
            else{
                console.log('FAIL- request URL:'+req.url);
            }
            if (req.method==method){
               console.log('OK- request METHOD:'+req.method);
            }
            if (req.method=='POST' || req.method=='PUT'){
                var post_data='';
                req.on('data', function(chunk){
                    chunk ? post_data += chunk :'';
                });
                req.on('end', function(chunk){
                    chunk ? post_data += chunk :'';

                    //verify POST DATA
                    if (post_data=="POST/PUT TEST DATA"){
                        console.log('OK- POST/PUT DATA received OK')
                    }
                    else{
                        console.log('FAIL- WRONG POST/PUT DATA: '+ post_data);
                    }
                    //END OF THE SERVER FLOW for PUT y POST
                    callback && callback();
                })
            }

            else{
                console.log('FAIL request METHOD:'+req.method);
            }

            if (req.headers['testheader']=='FOO_TEST_VAL'){
                console.log('OK HEADER FOUND: '+ req.headers['testheader']);
            }
            else{
                console.log('FAIL HEADER: '+ req.headers['testheader']);
            }
            res.writeHead(200);
            res.write('TEST-oneway');
            res.end();
            exports.end_point_res = res;
            //Destroy Server
            server.close();
            if (req.method=='GET'||req.method=='DELETE'){
                callback && callback();
            }

        }).listen(8765);


    //Launch a oneway request
    relayer_header[global.HEAD_RELAYER_HOST] = 'http://bandini:8765/testpath';
    relayer_header['testheader']='FOO_TEST_VAL';
    options =
    {
        hostname:LISTENER_HOSTNAME,
        port:LISTENER_PORT,
        method:method,
        headers:relayer_header
    };
    client_req = http.request(options, function (res) {
        var id = '';
        exports.client_res = res;
        res.on('data', function (chunk) {
            chunk ? id += chunk :'';
        });
        res.on('end', function (chunk) {
            chunk ? id += chunk:'';
            //Verify TEST


            console.log('Verify Client Side');
            //We got a 200 + id?
            if (res.statusCode==200){
                console.log('OK- 200 OK received');
            }
            else{
                console.log('FAIL-'+res.statusCode+' received');
            }

            if (id!='' && id){
                console.log('OK- ID: '+id+' received');
            }
            else{
                console.log('FAIL-  no id received');
            }
        });


    });
    if (method=='POST' || method=='PUT'){
       //Send post data
       client_req.write("POST/PUT TEST DATA");
    }
    client_req.end();
    exports.client_req= client_req;

}
};

exports.oneway_get = oneway('GET');
exports.oneway_post = oneway('POST');
exports.oneway_put = oneway('PUT');
exports.oneway_delete = oneway('DELETE');
exports.oneway = function(){
    async.series([
    exports.oneway_get,
    exports.oneway_post,
    exports.oneway_put,
    exports.oneway_delete], function(){console.log('End ONEWAY TEST')});
}

