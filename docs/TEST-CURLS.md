curl -v --header "X-Relayer-Host:nodejs.org" http://relaya:8030/

curl -v -H "X-Relayer-Host:nodejs.org" -H "X-relayer-persistence: STATUS" http://relaya:8030/

curl -v -H "X-Relayer-Host:nodejs.org" -H "X-relayer-persistence: HEADER" http://relaya:8030/

curl -v -H "X-Relayer-Host:nodejs.org" -H "X-relayer-persistence: BODY" http://relaya:8030/

curl -v -H "X-Relayer-Host:nodejs.org" -H "X-relayer-persistence: BODY" -H "X-relayer-encoding: base64" http://relaya:8030/

curl -v -H "X-Relayer-Host:nodejs.org" -H "X-relayer-persistence: STATUS" -H "x-relayer-httpcallback: http://relaylb:1234" http://relaya:8030/

curl -v -H "X-Relayer-Host:nodejs.org" -H "X-relayer-persistence: HEADER" -H "x-relayer-httpcallback: http://relaylb:1234" http://relaya:8030/

curl -v -H "X-Relayer-Host:nodejs.org" -H "X-relayer-persistence: BODY" -H "x-relayer-httpcallback: http://relaylb:1234" http://relaya:8030/

curl -v -H "X-Relayer-Host:nodejs.org" -H "X-relayer-persistence: BODY" -H "x-relayer-protocol: http" http://relaya:8030/

//ERROR MSG

curl -v -H "X-Relayer-Host:nohost" -H "X-relayer-persistence: BODY" -H "x-relayer-httpcallback: http://relaylb:1234" http://relaya:8030/

curl -v -H "X-Relayer-Host:nohost" -H "X-relayer-retry:1,2,1000" -H "X-relayer-persistence: BODY" -H "x-relayer-httpcallback: http://relaylb:1234" http://relaya:8030/