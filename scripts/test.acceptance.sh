############################ Config file version#######################################
# To run script edit acceptance.cfg and type ./test.acceptance.sh or direct use ./test.acceptance.sh test_suite environment to override config

#!/bin/bash
# sh file to execute the files based on configuration file

. ../config/test.acceptance.cfg

rm -rf test/acceptance/testReport/*.xml
cd ../test/acceptance
mkdir -p logs

if [ "$1" != "" ]&&[ "$2" != "" ]
then
./acceptance*.sh $1 $2./logs/acceptance.log 2>&1
else
./acceptance*.sh $test_suite $environment >./logs/acceptance.log
fi

exit $?
