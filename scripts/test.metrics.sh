############################ Metrics tests #######################################
#!/bin/bash
# sh file to execute the files based on configuration file

echo "_______METRICS TESTS_________"
#. ../config/test.acceptance.cfg

#rm -rf test/metrics/*.xml
cd ../test/
mkdir -p logs

if [ "$1" == "" ]
then
echo "_______________________________"
echo "User Stories in Acceptance"
more acceptance/*.js | grep -c 'describe('
echo "Test cases in Acceptance"
more acceptance/*.js | grep -c  'it('
#echo "________________"
echo "User Stories in Component"
more component/*.js | grep -c 'describe('
echo "Test cases in Component"
more component/*.js | grep -c  'it('
#echo "________________"
echo "User Stories in Integration"
more integration/*.js | grep -c 'describe('
echo "Test cases in Integration"
more integration/*.js | grep -c  'it('
#echo "________________"
echo "User Stories in E2E"
more e2e/*.js | grep -c 'describe('
echo "Test cases in E2E"
more e2e/*.js | grep -c  'it('
#echo "________________"
echo "____________TOTAL____________"
echo "##    User Stories / Features ##"
more */*.js | grep -c 'describe('
echo "##    Test Cases / Scenarios  ##"
more */*.js | grep -c  'it('
echo "_______________________________"
fi

exit $?

