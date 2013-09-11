#!/bin/bash

LISTENER=../bin/listener

LOG=Rush_listener_$HOSTNAME.log

. ../config/test.alarm.cfg

RUSH_HOST=http://localhost:$RUSH_PORT

TEST1=0
TEST2=0
TEST3=0
TEST4=0

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

function cert_bak { #Certificates backup
  mv -v $CERT_PATH $CERT_PATH.bak
  mv -v $KEY_PATH $KEY_PATH.bak
}

function cert_recover { #Recover certificates
  mv -v $CERT_PATH.bak $CERT_PATH
  mv -v $KEY_PATH.bak $KEY_PATH
}

function no_certs_found { #Throw no certs found error
  TEST1=1
  cert_bak
  beforeEach
  $LISTENER &
  afterEach
  cert_recover
  grep -q -e '| lvl=WARNING | op=LISTENER START UP | msg=Certs Not Found |' $LOG
  if [  $? -ne 0 ]; then
    TEST1=2
  fi
}

function invalid_request {
  TEST2=1
  $LISTENER &
  beforeEach
  curl -v -H "X-Relayer-Host:nodejs.org" -H "X-relayer-persistence: INVALID_PERSISTENCE" $RUSH_HOST #nvalid persistence, should be logged
  afterEach
  grep -q -e '| lvl=WARNING | op=ASSIGN REQUEST | msg=Request Error |' $LOG
  if [  $? -ne 0 ]; then
    TEST2=2
  fi
}

function redis_unavailable {
  TEST3=1

  stop_redis_wait

  beforeEach
  $LISTENER &
  afterEach
  grep -q -e '| lvl=ERROR | op=REDIS CONNECTION | msg=Redis Error |' $LOG
  if [  $? -ne 0 ]; then
    TEST3=2;
  fi

  start_redis_wait
}

function mongo_unavailable {
  TEST4=1

  stop_mongo_wait

  beforeEach
  $LISTENER &
  afterEach

  start_mongo_wait

  grep -q -e '| lvl=WARNING | op=INIT EVENT LISTENER | msg=Could not connect with MongoDB |' $LOG
  if [  $? -ne 0 ]; then
    TEST4=2
  fi
  grep -q -e '| lvl=ERROR | op=ADD-ONS START UP | msg=Error subscribing event listener |' $LOG
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
          no_certs_found
          ;;
        2)
          invalid_request
          ;;
        3)
          redis_unavailable
          ;;
        4)
          mongo_unavailable
          ;;
        0)
          no_certs_found
          invalid_request
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
  if [ $TEST1 -eq 1 ]; then echo -e "${green}Scenario 1: ALARM Certs not found generated${endColor}"; fi
  if [ $TEST1 -eq 2 ]; then echo -e "${red}Scenario 1: Should log Certs not found error${endColor}"; fi
  if [ $TEST2 -eq 1 ]; then echo -e "${green}Scenario 2: ALARM Request Error generated${endColor}"; fi
  if [ $TEST2 -eq 2 ]; then echo -e "${red}Scenario 2: Should log Request Error${endColor}"; fi
  if [ $TEST3 -eq 1 ]; then echo -e "${green}Scenario 3: ALARM Redis Error generated${endColor}"; fi
  if [ $TEST3 -eq 2 ]; then echo -e "${red}Scenario 3: Should log Redis Error${endColor}"; fi
  if [ $TEST4 -eq 1 ]; then echo -e "${green}Scenario 4: ALARM MongoDB Error generated${endColor}"; fi
  if [ $TEST4 -eq 2 ]; then echo -e "${red}Scenario 4: Should log Could not connect with MongoDB${endColor}"; fi
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
echo -e "\t1: Run Scenario 1. HTTPS certs not found"
echo -e "\t2: Run Scenario 2. Invalid request"
echo -e "\t3: Run Scenario 3. Redis server unavailable"
echo -e "\t4: Run Scenario 4. MongoDB unavailable"
echo -e "\t0: Run ALL tests"
echo
echo "==================================================================="
echo
echo -n "Choose one of the previous options: "
read option

menu

exit $return_value




