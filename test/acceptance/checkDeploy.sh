#!/bin/bash
# +++++++++++++++++++++++++++++++++++++++++++++++
# Launch this script from path /test/acceptance/
# Accepted parameters: RushServer RushPort RelayerEndpoint
# ./checkDeploy.sh
# example: ./checkDeploy.sh 176.34.66.250 80 http://www.google.es
# +++++++++++++++++++++++++++++++++++++++++++++++

# Rush Endpoint is provided
if [[ $1 &&  $2 ]] ; then
        echo "Info ENDPOINT: " $1":"$2
        mv config.js config.js.bak
        echo "exports.rushServer = {hostname: '$1', port: $2};" >> config.js
    else
       echo "Default execution (change the Rush server in the config.js file)"
fi

if [[ $1 &&  $3 ]] ; then
     echo "Info TARGET: " $3
     echo "exports.externalEndpoint = '$3';"  >> config.js
     else
     echo "Info TARGET: Default"
     echo "exports.externalEndpoint = 'http://www.google.es';"  >> config.js
fi

echo "_________ Test execution : _________"
mocha basicAcceptance.js -R spec
echo "_________ Test execution Completed _________  // "
exit 0
