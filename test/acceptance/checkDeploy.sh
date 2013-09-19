#!/bin/bash
# +++++++++++++++++++++++++++++++++++++++++++++++
# Launch this script from path /test/acceptance/
# Accepted parameters: RushServer RushPort RelayerEndpoint [TOKEN]
# ./checkDeploy.sh
# examples:
# (Old clusters) ./checkDeploy.sh 176.34.66.250 80 www.google.es
# (Apigee clusters) ./checkDeploy.sh telefonicaspain-test.apigee.net/rush/v1 443 www.google.com jaqv1vOp1qzdsscJ0NNah4sTn3l3AlEG
# (LoadBalancer userPasword) ./checkDeploy.sh telefonicaspain-test.apigee.net/rush/v1 443 www.google.com -u rush_user:pass
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
     echo "exports.externalEndpoint = 'www.google.es';"  >> config.js
fi

if [[ $1 &&  $4 = "-u" ]] ; then
     echo "Info USER: " $5
     echo "exports.user = '$5';"  >> config.js
     echo "Info TOKEN: NONE"
     echo "exports.token = '';"  >> config.js
else

     echo "Info TOKEN: " $4
     echo "exports.token = '$4';"  >> config.js
     #echo "exports.https = 'true';"  >> config.js
fi





echo "_________ Test execution : _________"
mocha basicAcceptance.js -R spec
echo "_________ Test execution Completed _________  // "
exit 0
