#!/bin/bash

LISTENER=../bin/listener

LOG=Rush_listener_$HOSTNAME.log

. ../config/test.alarm.cfg

RUSH_HOST=http://localhost:$RUSH_PORT

VERBOSE=false
FORCE=false

TEST1=true
TEST2=true
TEST3=true
TEST4=true

red='\e[91m'
endColor='\e[0m'

function kill_servers {
  if nc -z localhost $REDIS_PORT; then
    echo hola
    killall redis-server
  fi
  if nc -z localhost $MONGO_PORT; then
    killall mongod
  fi
  while nc -z localhost $REDIS_PORT || nc -z localhost $MONGO_PORT;
    do
      sleep 1
    done
}

function before {
  rm -rf mongo
  mkdir mongo
  rm -rf $LOG ##Remove log file
  $REDIS_PATH & ##Start redis-server
  redis_pid=$!
  $MONGO_PATH --dbpath ./mongo --quiet & #Start mongodb
  mongo_pid=$!
  until nc -z localhost $MONGO_PORT && nc -z localhost $REDIS_PORT ##Wait until they are both up
    do
      sleep 1
    done
}

function after {
  kill $redis_pid #Stop redis
  kill $mongo_pid #Stop mongo
  rm -rf ./mongo #Remove db directories
  while nc -z localhost $REDIS_PORT || nc -z localhost $MONGO_PORT;
    do
      sleep 1
    done
}

function beforeEach {
  sleep 3
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
  cert_bak
  beforeEach
  $LISTENER &
  afterEach
  cert_recover
  grep -q -e '| lvl=WARNING | op=LISTENER START UP | msg=Certs Not Found |' $LOG
  if [  $? -ne 0 ]; then
    TEST1=false
  fi
}

function invalid_request {
  $LISTENER &
  beforeEach
  curl -v -H "X-Relayer-Host:nodejs.org" -H "X-relayer-persistence: INVALID_PERSISTENCE" $RUSH_HOST #nvalid persistence, should be logged
  afterEach
  grep -q -e '| lvl=WARNING | op=ASSIGN REQUEST | msg=Request Error |' $LOG
  if [  $? -ne 0 ]; then
    TEST2=false
    return_value=1
  fi
}

function redis_unavailable {
  kill $redis_pid ##Kill redis
  beforeEach
  $LISTENER &
  afterEach
  grep -q -e '| lvl=ERROR | op=REDIS CONNECTION | msg=Redis Error |' $LOG
  if [  $? -ne 0 ]; then
    TEST3=false;
  fi
  $REDIS_PATH & #Restart redis
  redis_pid=$!
  until nc -z localhost $REDIS_PORT ##Wait until it is up
  do
    sleep 1
  done
}

function mongo_unavailable {
  kill $mongo_pid #Kill mongo
  beforeEach
  $LISTENER &
  afterEach
  $MONGO_PATH --dbpath ./mongo --quiet & #Restart mongo
  mongo_pid=$!
  until nc -z localhost $MONGO_PORT #Wait until it is up
    do
      sleep 1
    done
  grep -q -e '| lvl=WARNING | op=INIT EVENT LISTENER | msg=Could not connect with MongoDB |' $LOG
  if [  $? -ne 0 ]; then
    TEST4=false
  fi
  grep -q -e '| lvl=ERROR | op=ADD-ONS START UP | msg=Error subscribing event listener |' $LOG
  if [  $? -ne 0 ]; then
    TEST4=false
  fi
}


function menu {
  before
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
  if ! $TEST1; then echo -e "${red}Scenario 1: Should log Certs not found error${endColor}"; fi
  if ! $TEST2; then echo -e "${red}Scenario 2: Should log Request Error${endColor}"; fi
  if ! $TEST3; then echo -e "${red}Scenario 3: Should log Redis Error${endColor}"; fi
  if ! $TEST4; then echo -e "${red}Scenario 4: Should log Could not connect with MongoDB${endColor}"; fi
}


echo "----Alarm tests---"
echo "Options:"
echo "S: Stop redis-server and mongodb"
echo "1: Run Scenario 1. HTTPS certs not found"
echo "2: Run Scenario 2. Invalid request"
echo "3: Run Scenario 3. Redis server unavailable"
echo "4: Run Scenario 4. MongoDB unavailable"
echo "0: Run ALL tests"

echo -n "Choose one of the previous options: "
read option

if [ $option == "S" ]
then
  kill_servers
else
  if nc -z localhost $REDIS_PORT; then
    echo There is an active redis-server instance.
    echo Stop it or use --force
    exit 1
  fi

  if nc -z localhost $MONGO_PORT; then
    echo There is an active mongod instance.
    echo Stop it or run this script with flag -f
    exit 1
  fi
  menu
fi






exit $return_value




