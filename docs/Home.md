## RuSH (HTTP Relayer) v.1.0

### 1 - OVERVIEW

* Would you like to make effortless Async HTTP request?
* Do yo want to track the state of your relayed requests?
* Add automatic retransmissions/retries of your request?
* Do you need callbacks when your request is finished?
* Keep an historic record of custom information related to the request?
<p align="center">
<img src="wiki/Overview.png"/>
</p>

Rush implements a scalable mechanism to provide such functionality, with minor client impact (Header stamping HTTP API).

**Rush has been developed using:**

[![WebStorm](http://www.jetbrains.com/webstorm/documentation/webstorm_banners/webstorm1/webstorm210x60_white.gif)](http://www.jetbrains.com/webstorm/)

Ask us for your OpenSource License

### 2 - API REFERENCE
#### 2.1 - General Notes
Rush exploits the header stamping mechanism in order to configure every relayed request. You may add predefined headers to your http request in order to define the request expected behaviour.

##### 2.1.1 - URI Structure
The main Rush entry point is defined by the Host itself. **Path, Method, Query params, Headers and Protocol will be bypassed to target host**.

The exception to this rule is the method used for retrieving a response, defined as a readonly (GET) resource:
```
http://[RUSHHOST]/response/[id]
```

##### 2.1.2 - HTTP/S methods
From a resource perspective it could be summarized as:

* You may request http/https GET/POST/PUT/DELETE actions to `http(s)://[RUSHHOST]/*` in order to relay a request (to do so "x-relayer-host" header must be defined)

* You may request http/https GET action to `http(s)://[RUSHHOST]/response/[id]` in order to obtain stored persistent responses

##### 2.1.3 - Security
Rush enables secure communication between Clients and Target endpoints vía HTTPS protocol. Custom security headers will be bypassed to the Target endpoint. Look at [[oAuth Usage Example]]

##### 2.1.4 - Errors
Rush http error codes are not linked to Target endpoint responses. That is: 

* HTTP 200 Ok means that the relayed request has been accomplished by Rush

* HTTP 400 Error means that Rush itself is having some problems with your request

* HTTP 500 Error means that Rush endpoint is in trouble

Information related to the relayed error will be located as part of the Rush response body. **So you may find a HTTP 200 OK response (Rush has successfully relayed de request) while the Target endpoint gives you a HTTP 403 Error (in response body)**.

You will find detailed info at [[Detailed Resource View| Detailed-Resource-View-Relay]]

##### 2.1.5 - Encoding
Rush returns all its responses in a JSON file following a UTF-8 encondig. If you want to send some content to a Target Host you should set the **content-type** header properly (it will be bypassed to target host, Rush will ignore it).

If you want to retrieve and store binary content you must use the **"x-relayer-enconding"** header and set it to **"base64"** so the content of the request would be coded in base 64 and stored in Redis. Later, you will be able to retrieve the original content uncoding the response returned by Rush.

#### 2.2 -  Resources & Operations
Resource | HTTP/HTTPS | Description
--- | --- | ---
[RushHost]/response/:id    | GET | [[Retrieves :id response persistent data| Detailed-Resource-View-Response]]
[RushHost]/* | GET | [[Relays a GET request to Target Endpoint| Detailed-Resource-View-Relay]]
[RushHost]/* | POST | [[Relays a POST request to Target Endpoint| Detailed-Resource-View-Relay]]
[RushHost]/* | PUT | [[Relays a PUT request to Target Endpoint| Detailed-Resource-View-Relay]]
[RushHost]/* | DELETE | [[Relays a DELETE request to Target Endpoint| Detailed-Resource-View-Relay]]

**Note that the path used to relay a petition will be bypassed to target host.**

Follow the [[link| Detailed-Header-View]] for more info related to Header Stamping options for every [RushHost]/ request. 

#### 2.3 -  Header Stamping Model
The different policies may be included in the request header (header stamping). 

All the policies may (should) be mixed as desired.

Header/Policie | Value | Description | Mandatory
--- | --- | --- | ---
[[X-relayer-host | Detailed-header-view#basic-relay---oneway]] | TARGET_URL |Oneway http call | Yes
[[X-relayer-persistence | Detailed-header-view#persistence]] |"STATUS"/"HEADER"/"BODY" |Will keep the target-host response data | No
[[X-relayer-httpcallback| Detailed-header-view#http-callback]] |CALLBACK_URL|Will send an HTTP POST to CALLBACK_URL on completed/error request | No
[[X-relayer-httpcallback-error| Detailed-header-view#http-callback-error]] |CALLBACK_URL|Will send an HTTP POST to CALLBACK_URL on error request | No
[[X-relayer-retry | Detailed-header-view#retry]]|RETRY_TIMES|In case of socket exception or a Status Code different than 2xx the request will be retried on the specified numner of times. | No
[[X-relayer-traceid| Detailed-header-view#trace-id]]|TRACE ID|TRACE ID will be propagated as a first level member, so it can be used as part of the listeners logic (callback, historic…), logs and so on… | No
[[X-relayer-forcelog| Detailed-header-view#force-log]]|true/false|If the value of this header is true, ALL log messages (regardless of their level) associated to this request will be written to the file log and printed to the console. | No
[[X-relayer-proxy| Detailed-header-view#proxy]]|HOST:PORT|The request will be made througth a PROXY:PORT| No
[[X-relayer-encoding| Detailed-header-view#encoding]]|"base64"|specify target response encoding | No
[[X-relayer-protocol| Detailed-header-view#protocol]]|"http"/"https"|Specify the protocol (http/https) that Rush should use to carry out your request. When the header is not specified (or the value is not present), the protocol will be the same that was used to make the relay request to Rush. | No
[[X-relayer-server-cert| Detailed-header-view#server-cert]]|base64 of PEM certificate| The target host must authenticate itself with this certificate or the request will not be done | No
[[X-relayer-header| Detailed-header-view#header]]|list of "urlencoded" headers| Headers will be decoded and sent to target host | No
### 3 - GETTING STARTED
####Instalation Guide (Basic)
In order to install Rush (as a component), you should follow the next steps:

1. Download one stable [version](https://github.com/telefonicaid/Rush/tags)
2. After that, you need to install Rush dependencies. To do this, you have to execute the following command in your project directory:
```
npm install --production
```
3. Then you have to set up the databases editing the config file located in `/src/configBase.js`. Redis location and MongoDB location (if used) must be set. 
4. Once, you have set Redis hostname, you have to run it. Go to the **source folder** of your Redis installation and execute the following command:
```
./redis-server
```
5. If the databases are running you are able to start Rush. First of all, run a listener instance which will receive all the petitions. Then, run one or more consumer instances which will process all the requests received by the listener:
```
bin/listener.js //Can be executed more than once
bin/consumer.js //Can be executed more than once
```

### 4 - CONTRIBUTE
#### 4.1 - Development Environment Setup
At this moment, refer to 3-Installation Guide in order to obtain a dev environment. Avoid the ```-- production``` at ```npm install```

#### 4.2 - How to Run the Tests (e2e and acceptance)
Rush uses mocha as its testing suite.

Tests files are located in `test/e2e`. If you want to run a single test the command will be:
 
```
./mocha [name_of_the_test]
```

Notice that in this case you will have to install mocha globally:
 
```
npm install -g mocha
```

Otherwise, if you want to run the tests altogether the command is: 

```
grunt test
```
#### 4.3 Checking a deployed cluster on AWS

We have a checking list to ensure that a deployed cluster on AWS has been created and that is responding properly.

There are differents ways to call the test depending of the deployed architecture and the security set:

```
Rush/test/acceptance/checkDeploy.sh endpoint_IP PORT Final_endpoint
```

**Examples:**

**Running the checks against a Rush Listener:**
```
./checkDeploy.sh 127.0.0.1 80 www.google.com
```

**Running the checks against a Load Balancer with basic auth:**
```
./checkDeploy.sh 127.0.0.1 443 www.google.com -u user:pass
```

**Running the checks against a Apigee cluster with Token auth:**
```
./checkDeploy.sh endpoint/rush/path/v1 443 www.google.com TOKEN
```

#### 4.4 Running benchmarks

There are different benchmarks depending on the server conditions. 

**Blocking Server:** This benchmark controls the number of queued services when the server takes some time to answer the requests. This time can be configured in the 'config.js' file. Different tests will be executed with different delays: from the start time to the max delay increasing at the set interval.

**Flushing Queues:** This benchmark controls the time that takes the completion of a service. The number of services to be completed can be set in the 'config.js' file. In addition you can set the payload of the services. Different tests will be executed with differents payloads: from the start payload to the max payload increasing at the set interval.

**No Lag Server:** This benchmark controls the number of queued services when the server answers without any delays. You can set the number of bytes that the server will emit, the test time and the number of services to be completed.

#### 4.5 - TIP & TRICKS
* [[Some CURL examples|TEST-CURLS]]
* [[Internal events depicted|Implementing-Addons#current-internal-events]]

### 5. - ANNEX

#### 5.1 - ARCHITECTURE

Rush Implements a **Producer&Consumer** (+Worker) architecture where we may have several Producer nodes (node listener.js) and Consumer nodes (node consumer.js). Both kind of nodes are implemented by **node.js** processes which intercommunicate due to a buffer/queue hosted by **REDIS**.
Every consumer will manage a pool of workers implementing Rush behaviour. They will also provide AddOns in order to extend policies or include new functionality associated to internal events.
**HTTP Header stamping** is used in order to pre-program the expected behaviour of each request.

<p align="center">
  <img src=wiki/Architecture.png/>
</p>

#### 5.2 Implementing AddOns
Click the [[link| Implementing-Addons]] for more info related to the implementation of AddOns. 