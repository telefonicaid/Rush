Return to [Home](Overview.md)

The following document will expose the implemented policies, their expected behaviour and usage examples.

The different policies must be included in the request header (header stamping).

All the policies may (should) be mixed as desired.

###BASIC RELAY - ONEWAY
* AFFECTED POLICIES: "X-Relayer-Host: TARGET_HOST"
* BEHAVIOUR: Oneway http call, rush will not keep any result.
* Mandatory: Yes
* EXAMPLE: curl -v --header "X-Relayer-Host:[target-host]:[port]" http://[rush-host]:[port]/

###PERSISTENCE
* AFFECTED POLICIES: "X-Relayer-Host: TARGET_HOST", "X-relayer-persistence: STATUS||HEADER||BODY"
* BEHAVIOUR: Combined with any other policies will keep the stated target-host response data (STATUS||HEADER||BODY). "BODY" will keep STATUS and HEADER also, HEADER will keep STATUS also. If you want to keep binary data you must use the encoding header to encode the body properly (base64). This information may be retrieved at http://[rush-host]/response/[id]
* Mandatory: No
* EXAMPLE: curl -v --header "X-relayer-persistence: HEADER" --header "X-Relayer-Host:[target-host]:[port]" http://[rush-host]:[port]/

###PROTOCOL
* AFFECTED POLICIES: "X-Relayer-Host: TARGET_HOST", "X-Relayer-Protocol: http||https"
* BEHAVIOUR: Oneway call using the protocol specified (http or https).
* Mandatory: No. When the header is not specified (or the value is not present), protocol used will be the same used to make the relay request to Rush.
* EXAMPLE: curl -v --header "X-Relayer-Protocol: http" --header "X-Relayer-Host:[target-host]:[port]" http://[rush-host]:[port]/

###HTTP-CALLBACK
* AFFECTED POLICIES: "X-Relayer-Host: TARGET_HOST", "x-relayer-httpcallback: CALLBACK_URL"
* BEHAVIOUR: once the relayed request is completed Rush will send an HTTP POST the CALLBACK_URL with the target response or with the error status.
* Mandatory: No
* EXAMPLE: curl -v --header "x-relayer-httpcallback: http://[callback_host]:[port]" --header "X-Relayer-Host:[target-host]:[port]" http://[rush-host]:[port]/
* CALLBACK BODY: 

Case of successful request
```Javascript
{
    "id":"a2e29b10-2746-11e2-8b17-ab24de2ec49c",
    "statusCode":200,
    "headers":{
        "content-type":"application/json",
        "connection":"keep-alive",
        "transfer-encoding":"chunked"},
    "body":"<>...<>"
}
```

Case of error request
```Javascript
{
    "id":"78c69e20-2747-11e2-8b17-ab24de2ec49c",
    "exception": {
        "exceptionId": "SVC Relayed Host Error",
        "exceptionText": "getaddrinfo ENOTFOUND"
    }
}
```
###HTTP-CALLBACK-ERROR
* AFFECTED POLICIES: "X-Relayer-Host: TARGET_HOSY", "x-relayer-httpcallback-error: CALLBACK_URL"
* BEHAVIOUR: once the relayed request is completed with ERROR state Rush will send an HTTP POST the CALLBACK_URL with the error status.
* Mandatory: No
* EXAMPLE: curl -v --header "x-relayer-httpcallback-error: http://[callback_host]:[port]" --header "X-Relayer-Host:[target-host]:[port]" http://[rush-host]:[port]/
* CALLBACK BODY:

Case of error request
```Javascript
{
    "id":"78c69e20-2747-11e2-8b17-ab24de2ec49c",
    "exception": {
        "exceptionId": "SVC Relayed Host Error",
        "exceptionText": "getaddrinfo ENOTFOUND"
    }
}
```

###RETRY
* AFFECTED POLICIES: "X-Relayer-Host: TARGET_HOST", "X-relayer-retry: RETRY_TIMES"
* BEHAVIOUR: In case of socket exception or a Status Code different than 2xx the request will be retried on the specified numner of times. 
When a petition fails, it will be inserted on a bucket. Each retry bucket will be emptied according to the value specified on the Rush config. When a bucket is emptied, all tasks return to the main queue and will be retried.
* Mandatory: No
* EXAMPLE: curl -v --header --header "X-relayer-retry: 3" --header "X-Relayer-Host:[target-host]:[port]" http://[rush-host]:[port]/

###TRACE ID
* AFFECTED POLICIES: "X-Relayer-Host: TARGET_HOST", "X-Relayer-traceid: TRACE_ID"
* BEHAVIOUR: The stated TRACE ID will be propagated as a first level member in internal events, so it can be used as part of the listeners logic (callback, historic...). Internally it will be available as the rest of the request headers.
* Mandatory: No. This header is used for logging purposes, so if you don't include this header, debug your code will be harder. 
* EXAMPLE: curl -v --header --header "X-Relayer-traceid: BUSSINESLOGIC-ID" --header "X-Relayer-Host:[target-host]:[port]" http://[rush-host]:[port]/

###FORCE LOG
* AFFECTED POLICIES: "X-Relayer-Host: TARGET_HOST", "X-Relayer-forcelog: true||false"
* BEHAVIOUR: If the value of this header is true, ALL log messages (regardless of their level) associated to this request will be written to the file log and printed to the console.
* Mandatory: No. This header is used for logging purposes, so if you don't include this header, debug your code will be harder. 
* EXAMPLE: curl -v --header --header "X-Relayer-focelog: true" --header "X-Relayer-Host:[target-host]:[port]" http://[rush-host]:[port]/

###ENCODING
* AFFECTED POLICIES: "X-relayer-encoding: base64", "X-Relayer-Host: TARGET_HOST", "X-relayer-persistence:BODY"
* BEHAVIOUR: encode as Base64 body response (if BODY persistence is required) from target host. Allows binary friendly behaviour
* Mandatory: No
* EXAMPLE: curl -v --header "X-relayer-encoding: base64" --header "X-relayer-persistence: BODY" --header "X-Relayer-Host:[target-host]/MyImage.jpg:[port]" http://[rush-host]:[port]/

###PROXY
* AFFECTED POLICIES: "X-Relayer-Host: TARGET_HOST", "x-Relayer-Proxy: PROXY:PORT"
* BEHAVIOUR: The request will be made to PROXY at port PORT. 'Host' header will remain as the target host and the URI path will be made absolute in order to forward the request through the proxy PROXY. A default proxy can be set in the config file for all request that does not have a "x-relayer-proxy" header (If this value is set, all request will be send through the proxy).
* Mandatory: No
* EXAMPLE: curl -v --header --header "X-relayer-proxy: [proxy]:[port]" --header "X-Relayer-Host:[target-host]:[port]" http://[rush-host]:[port]/

###SERVER CERT
* AFFECTED POLICIES: "X-Relayer-Host: TARGET_HOST", "X-Relayer-Server-Cert: CERTIFICATE"
* BEHAVIOUR: The target host's certificate must be equal to the certificate provided in the header to make the request by HTTPS. The value of the header must be the certificate in PEM format, encoded in base64
* Mandatory: No
* EXAMPLE: curl -v --header"X-Relayer-Server-Cert: BASE64_CERT" --header "X-Relayer-Host:[target-host]:[port]" http://[rush-host]:[port]/

**Important!** If you are running node version below 0.10 you CAN'T use this header since it does not support custom CA's.

###HEADER
* AFFECTED POLICIES: "X-Relayer-Host: TARGET_HOST", "X-Relayer-Header: LIST_HEADERS"
* BEHAVIOUR: Each element on list will be "urldecoded" and if it is a pair with the form "name:value", it will be sent to the target host as a header, indistinguishably from the others headers in the request. Each header "name:value" should be URL-encoded (percent-encoding), with functions like `encodeURIComponent` (Javascript), `urllib.quote` (Python), and `url.QueryEscape` (Go) or any better alternative one. The encoded values are then combined in a list of comma separated items
* Mandatory: No
* EXAMPLE: curl -v --header"X-Relayer-Header: LIST_URLENCODED_HEADERS" --header "X-Relayer-Host:[target-host]:[port]" http://[rush-host]:[port]/

An example in node.js of making a request with two extra headers (`setHeader` joins elements of the list with `,`)

```Javascript
var request = http.request(options, callback);
request.setHeader("X-Relayer-Header", [
  ,encodeURIComponent("User-Agent:Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.57 ")
  ,encodeURIComponent("Accept-Language:es-ES,es;q=0.8")]);
request.end();
``` 

Return to [Home](Overview.md)