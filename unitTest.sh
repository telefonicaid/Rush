#!/bin/bash
rm -rf site/coverage site/surefire-reports
mkdir -p site/coverage site/surefire-reports
rm -rf xunit.xml
npm install
echo "[WARNING] Redis must be running, and the http certificates created"
echo "Executing unit Test"
node ./node_modules/.bin/istanbul cover --root lib/ --dir site/coverage -- grunt xunit --force
mv xunit.xml site/surefire-reports/TEST-xunit.xml
echo "Generating coverage report"
node ./node_modules/.bin/istanbul cover --root lib/ --dir site/coverage cobertura
node ./node_modules/.bin/istanbul report --dir site/coverage/ cobertura
#node ./node_modules/.bin/istanbul report --root coverage/ cobertura