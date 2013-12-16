# API REFERENCE
## General Notes

Rush exploits the header stamping mechanism in order to configure every relayed request. You may add predefined headers to your http request in order to define the request expected behaviour.

### URI Structure

The main Rush entry point is defined by the Host itself. **Path, Method, Query params, Headers and Protocol will be bypassed to target host**.

The exception to this rule is the method used for retrieving a response, defined as a readonly (GET) resource:
```
http://[RUSHHOST]/response/[id]
```

### HTTP/S methods

From a resource perspective it could be summarized as:

* You may request http/https GET/POST/PUT/DELETE actions to `http(s)://[RUSHHOST]/*` in order to relay a request (to do so "x-relayer-host" header must be defined)

* You may request http/https GET action to `http(s)://[RUSHHOST]/response/[id]` in order to obtain stored persistent responses

### Security

Rush enables secure communication between Clients and Target endpoints vía HTTPS protocol. Custom security headers will be bypassed to the Target endpoint. Look at [oAuth Usage Example](oAuth-usage-example.md)

### Errors

Rush http error codes are not linked to Target endpoint responses. That is: 

* HTTP 200 Ok means that the relayed request has been accomplished by Rush

* HTTP 400 Error means that Rush itself is having some problems with your request

* HTTP 500 Error means that Rush endpoint is in trouble

Information related to the relayed error will be located as part of the Rush response body. **So you may find a HTTP 200 OK response (Rush has successfully relayed de request) while the Target endpoint gives you a HTTP 403 Error (in response body)**.

You will find detailed info at [Detailed Resource View](Detailed-resource-view-relay.md)

### Encoding

Rush returns all its responses in a JSON file following a UTF-8 encondig. If you want to send some content to a Target Host you should set the **content-type** header properly (it will be bypassed to target host, Rush will ignore it).

If you want to retrieve and store binary content you must use the **"x-relayer-enconding"** header and set it to **"base64"** so the content of the request would be coded in base 64 and stored in Redis. Later, you will be able to retrieve the original content uncoding the response returned by Rush.

## Resources & Operations

Resource | HTTP/HTTPS | Description
--- | --- | ---
[RushHost]/response/:id    | GET | [Retrieves :id response persistent data](Detailed-resource-view-response.md)
[RushHost]/* | GET | [Relays a GET request to Target Endpoint](Detailed-resource-view-relay.md)
[RushHost]/* | POST | [Relays a POST request to Target Endpoint](Detailed-resource-view-relay.md)
[RushHost]/* | PUT | [Relays a PUT request to Target Endpoint](Detailed-resource-view-relay.md)
[RushHost]/* | DELETE | [Relays a DELETE request to Target Endpoint](Detailed-resource-view-relay.md)

**Note that the path used to relay a petition will be bypassed to target host.**

Follow the [link](Detailed-header-view.md) for more info related to Header Stamping options for every [RushHost]/ request. 

## Header Stamping Model

The different policies may be included in the request header (header stamping). 

All the policies may (should) be mixed as desired.

Header/Policie | Value | Description | Mandatory
--- | --- | --- | ---
[X-relayer-host](Detailed-header-view.md#basic-relay---oneway) | TARGET_URL |Oneway http call | Yes
[X-relayer-persistence](Detailed-header-view.md#persistence) |"STATUS"/"HEADER"/"BODY" |Will keep the target-host response data | No
[X-relayer-httpcallback](Detailed-header-view.md#http-callback) |CALLBACK_URL|Will send an HTTP POST to CALLBACK_URL on completed/error request | No
[X-relayer-httpcallback-error](Detailed-header-view.md#http-callback-error) |CALLBACK_URL|Will send an HTTP POST to CALLBACK_URL on error request | No
[X-relayer-retry](Detailed-header-view.md#retry)|RETRY_TIMES|In case of socket exception or a Status Code different than 2xx the request will be retried on the specified numner of times. | No
[X-relayer-traceid](Detailed-header-view.md#trace-id)|TRACE ID|TRACE ID will be propagated as a first level member, so it can be used as part of the listeners logic (callback, historic…), logs and so on… | No
[X-relayer-forcelog](Detailed-header-view.md#force-log)|true/false|If the value of this header is true, ALL log messages (regardless of their level) associated to this request will be written to the file log and printed to the console. | No
[X-relayer-proxy](Detailed-header-view.md#proxy)|HOST:PORT|The request will be made througth a PROXY:PORT| No
[X-relayer-encoding](Detailed-header-view.md#encoding)|"base64"|specify target response encoding | No
[X-relayer-protocol](Detailed-header-view.md#protocol)|"http"/"https"|Specify the protocol (http/https) that Rush should use to carry out your request. When the header is not specified (or the value is not present), the protocol will be the same that was used to make the relay request to Rush. | No
[X-relayer-server-cert](Detailed-header-view.md#server-cert)|base64 of PEM certificate| The target host must authenticate itself with this certificate or the request will not be done | No
[X-relayer-header](Detailed-header-view.md#header)|list of "urlencoded" headers| Headers will be decoded and sent to target host | No
