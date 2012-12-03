[![Build Status](https://travis-ci.org/telefonicaid/Rush.png)](https://travis-ci.org/telefonicaid/Rush)

#Rush 
===

* Would you like to make effortless Async HTTP request?
* Do yo want to track the state of your relayed requests?
* Add automatic retransmissions/retries of your request?
* Do you need callbacks when your request is finished?
* Keep an historic record of custom information related to the request?

Rush implements an scalable mechanism to provide such functionality, with minor client impact (Header stamping HTTP API).

##Instalation Guide
In order to run Rush, you have to follow the next steps:

1. First of all, you have to install Rush dependencies. To do this, you have to execute the following command in your project directory:
```
npm install --production
```
2. Then you have to set up the databases editing the config file located in `/src/config_base.js`. Redis hostname must be set in line 8. MongoDB hostname and port must be set in lines 18 and 19 respectively.
3. Once, you have set Redis hostname, you have to run it. Go to the **source folder** of your own installation of Redis and execute the following command:
```
./redis-server
```
4. MongoDB must be active in the host set in the config file. If you have selected your own MongoDB server, you must go the **binary folder** of your installation and execute the following commands (according to the README file of MongoDB):
```
mkdir /data/db
./mongod
```
Probably, you will need administrator privileges.
5. When you have executed the databases, you are able to run Rush. First of all you have to run a listener which will receive all the petitions. Then you must run one or more consumer which will process all the petitions received by the listener. The listener and the consumer are located in the `src` folder:
```
cd src
node listener.js
node consumer.js //Can be executed more than once
```

##User Manual
The following document will expose the implemented policies, their expected behaviour and usage examples.

The different policies will be included in the request header (header stamping). 

All the policies may be mixed as desired.


###BASIC RELAY - ONEWAY
* AFFECTED POLICIES: "X-Relayer-Host: TARGET_URL"
* BEHAVIOUR: Oneway http call, rush will not keep any result.
* EXAMPLE (CURL): curl -v --header "X-Relayer-Host:http://[target-host]:[port]" http://[rush-host]:[port]/

###PERSISTENCE
* AFFECTED POLICIES: "X-Relayer-Host: TARGET_URL", "X-relayer-persistence: STATUS||HEADER||BODY"
* BEHAVIOUR: Combined with any other policies will keep the stated target-host response data (STATUS||HEADER||BODY). "BODY" will keep STATUS and HEADER also, HEADER will keep STATUS also.
This information may be retrieved at http://[rush-host]/response/[id]
* EXAMPLE: curl -v --header "X-relayer-persistence: HEADER" --header "X-Relayer-Host:http://[target-host]:[port]" http://[rush-host]:[port]/

###HTTP-CALLBACK
* AFFECTED POLICIES: "X-Relayer-Host: TARGET_URL",  "x-relayer-httpcallback: CALLBACK_URL"
* BEHAVIOUR: once the relayed request is completed Rush will send an HTTP POST the CALLBACK_URL with the target response or with the error status.
* EXAMPLE: curl -v --header "x-relayer-httpcallback: http://[callback_host]:[port]" --header "X-Relayer-Host:http://[target-host]:[port]" http://[rush-host]:[port]/

###RETRY
* AFFECTED POLICIES: "X-Relayer-Host: TARGET_URL",  "X-relayer-retry: interval1_ms, interval2_ms,..."
* BEHAVIOUR: In case of socket exception the request will be retried on the specified intervals (in milliseconds). If the target host responses with an HTTP ERROR (404, 400...) this will be considered a valid result from the Rush perspective
* EXAMPLE: curl -v --header --header "X-relayer-retry:1,2,1000" --header "X-Relayer-Host:http://[target-host]:[port]" http://[rush-host]:[port]/

###TOPIC
* AFFECTED POLICIES: "X-Relayer-topic:TOPIC" 
* BEHAVIOUR: The stated TOPIC will be propagated as a first level member in internal events, so it can be used as part of the listeners logic (callback, historic...). Internally it will be available as the rest of the request headers.
* EXAMPLE: curl -v --header --header "X-Relayer-topic: BUSSINESLOGIC-ID" --header "X-Relayer-Host:http://[target-host]:[port]" http://[rush-host]:[port]/
[More examples](TEST-CURLS)

##Retrieving Data: GET / Callback / Events
Rush provides several mechanisms to obtain information about the relayed transactions. Each of those mechanism will expose **JSON** data structures that may vary depending on policies or channel used.
It is important to remark that no all the available channels may have sense in all the usage scenarios, so it is necessary to differentiate them and choose the best suited to your necessities.

### GET response
This is the basic channel and the easiest way to obtain information related to the destination host response. It is associated to the persistence policy, that is it will return data _iff_ there is a valid PERSISTENCE POLICY assigned to the request.
The retrieved information will be obtained from the Rush **transient** repository. So it will EXPIRE at some moment (EXPIRE interval is not decided yet, but it is mandatory to purge Rush repository).
If there is a HTTPCALLBACK policy set, information about the callback status will be returned from this channel also.

Some examples:

``
http://[RUSHHOST]/response/[id]
`` 

OK
```Javascript
    {
    "topic":"undefined",
    "statusCode":"200",
    "headers":{
        "connection":"keep-alive",
        "transfer-encoding":"chunked"},
    "id":"f2de35b0-2742-11e2-8b17-ab24de2ec49c",
    "body":"<>...<>"}
```

ERROR
```Javascript
    {
    "id":"a2de5cb0-2743-11e2-8b17-ab24de2ec49c",
    "topic":"undefined",
    "error":"ENOTFOUND(getaddrinfo)"
    }
```
WITH CALLBACK OK
```Javascript
    {
    "headers":{
       "content-type":"application/json",
       "connection":"keep-alive",
       "transfer-encoding":"chunked"},
    "id":"01bd8340-2745-11e2-8b17-ab24de2ec49c",
    "body":"<>...<>",
    "topic":"undefined",
    "statusCode":"200",
    "callback_status":"200"
    }
```
WITH CALLBACK ERROR
```Javascript
    {
    "headers":{
       "content-type":"application/json",
       "connection":"keep-alive",
       "transfer-encoding":"chunked"},
    "id":"01bd8340-2745-11e2-8b17-ab24de2ec49c",
    "callback_err":"ENOTFOUND(getaddrinfo)",
    "body":"<>...<>",
    "topic":"undefined",
    "statusCode":"200"
    }
```

###HTTP-CALLBACK
This mechanism PUSH relevant data via HTTP-POST to a previously stablished HTTP SERVER endpoint (HTTP-CALLBACK POLICY). The information sent is the same than in the GET/retrieve option (except callback information).

OK
```Javascript
    {
    "id":"a2e29b10-2746-11e2-8b17-ab24de2ec49c",
    "statusCode":200,
    "headers":{
        "content-type":"application/json",
        "connection":"keep-alive",
        "transfer-encoding":"chunked"},
    "body":"<>...<>"}
```

ERROR
```Javascript
    {
    "id":"78c69e20-2747-11e2-8b17-ab24de2ec49c",
    "error":"ENOTFOUND(getaddrinfo)"
    }
```

###System Events
Rush will emit detailed information as events. Events are intended to be a communication mechanism with external systems, typically an historic DB (but any kind of system could be subscribed and react to those events: Queues, External APIS...). To do so an _ad-hoc_ Event Handler must be provided (a .js file with the necessary logic) to be executed on events arrival (decoupled subscription mechanism will be provided if necessary in further versions).

As an example a MongoDB handler, keeping historic data, is provided. It is important to remark that this historic support does not "belongs" to Rush platform.

####MongoDB Historic State (Optional)
Here we will keep the most detailed information. Here we will find all the reached states ("Pending", "Processing", "Completed", "Error"), times and results of every transaction.

PENDING

```Javascript
    { 
     "id" : "59ec70b0-a3f8-11e1-9a40-717f5f83ff09",
     "topic" : "undefined",
     "state" : "pending", 
     "date" : { "$date" : 1337682285379 }, 
     "task" : { 
              "id" : "59ec70b0-a3f8-11e1-9a40-717f5f83ff09", 
              "method" : "POST", 
              "httpVersion" : "1.1", 
              "url" : "/", 
              "headers" : {...}, 
              "body" : "" 
              }, 
      "_id" : { "$oid" : "4fbb696d836b4b781d000003" } 
     }
```

PROCESSING

```Javascript

     { 
       "id" : "c1882ed0-a3f8-11e1-9a40-717f5f83ff09", 
       "topic" : "undefined"
       "state" : "processing", 
       "date" : { "$date" : 1337682459251 }, 
       "task" : { 
                 "id" : "c1882ed0-a3f8-11e1-9a40-717f5f83ff09", 
                 "method" : "POST", 
                 "httpVersion" : "1.1", 
                 "url" : "/", 
                 "headers" : {...}, 
                 "body" : "" 
                 }, 
       "idConsumer" : "consumerA:2", 
       "_id" : { "$oid" : "4fbb6a1babb625b81500000a" }
```

COMPLETED

```Javascript
 {
        "id":"7cdc9ae0-95e4-11e1-bc10-551d65f43cb1",
        "topic":"undefined"
        "state":"completed",
        "date":{"$date":1336134438145},
        "task":{
            "id":"7cdc9ae0-95e4-11e1-bc10-551d65f43cb1",
            "method":"GET",
            "httpVersion":"1.1",
            "url":"/",
            "headers":{
                "host":"www.tid.es",
                "connection":"keep-alive",
                "x-relayer-persistence":"BODY",
                "x-relayer-host":"http://www.tid.es"
             },
            "body":"<>...</>"
         },
        "result":{
                "id":"7cdc9ae0-95e4-11e1-bc10-551d65f43cb1",
                "topic":"undefined"
                "statusCode":200,
                "headers":{
                          "content-length":"167",
                          "content-type":"text/html",
                          },
                "body":"<>...</>"
                },
        },
        "_id":{
            "$oid":"4fa3cb26b09314cb98000020"
        }
    }
```

ERROR

```Javascript
    { "id" : "59ec70b0-a3f8-11e1-9a40-717f5f83ff09", 
      "topic": "undefined",
      "state" : "error", 
      "date" : { "$date" : 1337682287652 }, 
      "task" : {...}, 
      "idConsumer" : "consumerA:0", 
      "result" : { 
            "id": "78c69e20-2747-11e2-8b17-ab24de2ec49c",
            "topic": "undefined",
            "error": "ENOTFOUND(getaddrinfo)" }, 
      "_id" : { "$oid" : "4fbb696fabb625b815000003" } 
    }
```

CALLBACK_STATE

```Javascript
    { "id" : "c1882ed0-a3f8-11e1-9a40-717f5f83ff09", 
      "topic" : "undefined"
      "state" : "callback_state", 
      "date" : { "$date" : 1337682461311 }, 
      "task" : {...}, 
      "err" : null, 
      "result" : { "callback_status" : 200 }, 
      "_id" : { "$oid" : "4fbb6a1dabb625b81500000d" } 
     }
```

PERSISTENCE_STATE

```Javascript
    { "id" : "c1882ed0-a3f8-11e1-9a40-717f5f83ff09", 
      "topic" : "undefined",
      "state" : "persistence_state", 
      "date" : { "$date" : 1337682459295 }, 
      "task" : {...}, 
      "err" : null, 
      "result" : { 
               "id" : "c1882ed0-a3f8-11e1-9a40-717f5f83ff09", 
               "topic" : "undefined"
               "statusCode" : 302, 
               "headers" : {...}, 
               "body" : "<head>...</body>" }, 
      "_id" : { "$oid" : "4fbb6a1babb625b81500000c"} 
    }
```

####MongoDB Error Log (Optional)
All the system errors will be emitted also as a way to maintain an error log or to communicate with Operation systems.

REQUEST ERROR
```Javascript
    { 
    "id" :   "59ec70b0-a3f8-11e1-9a40-717f5f83ff09", 
    "date" : { "$date" : 1337682287650 }, 
    "err" :  { "resultOk" : false, "error" : "ENOTFOUND(getaddrinfo)" }, 
    "_id" : { "$oid" : "4fbb696fabb625b815000002" } 
    }
```
##Running test
### Dependencies

Rush uses mocha as its testing suite. To install Mocha and tests dependencies run `npm install` from Rush root directory.



### Running tests

Tests files are located in Rush/tests/test. If you want to run a single test the command will be 
`./mocha [name_of_the_test]` (note that in this case you will have to install mocha globally: `npm install -g mocha`). Otherwise, if you want to run all the tests together the command is: 
`make test` (from 'tests' dir)

## Rush and OAuth

This in an example of a request to Twitter API with with OAuth authentication:
```
var util = require('util');
var http = require('http');
var oauth = require('oauth-client');

var consumer = oauth.createConsumer('[your consumer key]', '[your consumer secret]');
var token = oauth.createToken('[token key]', '[token secret]');
var signer = oauth.createHmac(consumer, token);

var options = {
    "port":3001,
    "host":"localhost",
    "path":"/",
    "method":"GET",
    "headers":{
        "X-relayer-persistence":"BODY",
        "X-Relayer-Host":"https://api.twitter.com:443/1.1/statuses/mentions_timeline.json"
    }
};

//  fillURL = function(path, host, port, https)
var uri = oauth.fillURL("/1.1/statuses/mentions_timeline.json", "api.twitter.com", 443, true);

options.headers.autorization = oauth.signRequest(options.method, uri, options.headers, options.body, signer).authorization;

var req = http.request(options, function (res) {
    res.on('data', function (chunk) {
        console.log(chunk.toString());
    });
});
req.end();
```





