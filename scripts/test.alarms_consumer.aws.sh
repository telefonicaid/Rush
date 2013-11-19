#!/bin/bash

CONSUMER=../bin/consumer

LOG=Rush_consumer_$HOSTNAME.log

. ../config/test.alarm.cfg

TEST1=0
TEST2=0

red='\e[1;91m'
green='\e[1;32m'
endColor='\e[0m'

function stop_redis_wait {
  echo -e "\n Now STOP Redis server at $REDIS_HOST:$REDIS_PORT and press any key"
  read
}

function start_redis_wait {
  echo -e "\n Now START Redis server at $REDIS_HOST:$REDIS_PORT and press any key"
  read
}

function stop_mongo_wait {
  echo -e "\n Now STOP Mongo server at $MONGO_HOST:$MONGO_PORT and press any key"
  read
}

function start_mongo_wait {
  echo -e "\n Now START Mongo server at $MONGO_HOST:$MONGO_PORT and press any key"
  read
}

function before {

  rm -rf $LOG ##Remove log file

  start_redis_wait
  start_mongo_wait
}

function after {

  stop_redis_wait
  stop_mongo_wait

  mv $LOG RUSH_LOG_`date -u +%Y-%m-%d-%H:%M`.log
}

function beforeEach {
  sleep 1
}

function afterEach {
  sleep 5
  pid=$!
  kill $pid
}

function redis_unavailable {
  TEST1=1

  stop_redis_wait

  beforeEach
  $CONSUMER &
  afterEach
  grep -q -e '| lvl=ERROR | op=REDIS CONNECTION | msg=Redis Error |' $LOG
  if [  $? -ne 0 ]; then
    TEST1=2;
  fi

  start_redis_wait
}

function mongo_unavailable {
  TEST1=1

  stop_mongo_wait

  beforeEach
  $CONSUMER &
  afterEach

  start_mongo_wait

  grep -q -e '| lvl=WARNING | op=INIT EVENT LISTENER | msg=Could not connect with MongoDB |' $LOG
  if [  $? -ne 0 ]; then
    TEST4=2
  fi
  grep -q -e '| lvl=ERROR | op=LISTENER START UP | msg=listener could not be started |' $LOG
  if [  $? -ne 0 ]; then
    TEST4=2
  fi
}


function menu {
  before

  exec 2>&1
  exec > >(tee ALARMS_LOG_`date -u +%Y-%m-%d-%H:%M`.log) # Save stdout to a file

  case $option in
        1)
          redis_unavailable
          ;;
        2)
          mongo_unavailable
          ;;
        0)
          redis_unavailable
          mongo_unavailable
          ;;
        *) echo "Invalid input"
            ;;
  esac
  after
  echo
  echo TEST RESULTS:
  echo ===========================
  echo
  if [ $TEST1 -eq 1 ]; then echo -e "${green}Scenario 1: ALARM Redis Error generated${endColor}"; fi
  if [ $TEST1 -eq 2 ]; then echo -e "${red}Scenario 1: Should log Redis Error${endColor}"; fi
  if [ $TEST2 -eq 1 ]; then echo -e "${green}Scenario 2: ALARM MongoDB Error generated${endColor}"; fi
  if [ $TEST2 -eq 2 ]; then echo -e "${red}Scenario 2: Should log Could not connect with MongoDB${endColor}"; fi
  echo
}
echo "==================================================================="
echo "               * ALARM TEST *"
echo "==================================================================="
echo ">> CONFIG <<                       "
echo
echo "Configure Rush and Rush components in the config file:"
echo "     - RUSH/config/test.alarm.cfg"
echo
echo "==================================================================="
echo ">> OPTIONS <<                      "
echo
echo -e "\t1: Run Scenario 1. Redis server unavailable"
echo -e "\t2: Run Scenario 2. MongoDB unavailable"
echo -e "\t0: Run ALL tests"
echo
echo "==================================================================="
echo
echo -n "Choose one of the previous options: "
read option

menu

exit $return_value




