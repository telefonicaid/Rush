# CONTRIBUTE

## Development Environment Setup

At this moment, refer to 3-Installation Guide in order to obtain a dev environment. Avoid the ```-- production``` at ```npm install```

## How to Run the Tests (e2e and acceptance)
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
## Checking a deployed cluster on AWS

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

## Running benchmarks

There are different benchmarks depending on the server conditions. 

**Blocking Server:** This benchmark controls the number of queued services when the server takes some time to answer the requests. This time can be configured in the 'config.js' file. Different tests will be executed with different delays: from the start time to the max delay increasing at the set interval.

**Flushing Queues:** This benchmark controls the time that takes the completion of a service. The number of services to be completed can be set in the 'config.js' file. In addition you can set the payload of the services. Different tests will be executed with differents payloads: from the start payload to the max payload increasing at the set interval.

**No Lag Server:** This benchmark controls the number of queued services when the server answers without any delays. You can set the number of bytes that the server will emit, the test time and the number of services to be completed.

## TIP & TRICKS
* [Some CURL examples](TEST-CURLS.md)
* [Internal events depicted](Implementing-Addons.md#current-internal-events)

 
