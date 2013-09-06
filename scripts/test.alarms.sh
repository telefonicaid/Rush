#!/bin/bash

LISTENER=../bin/listener

LOG=Rush_listener_$HOSTNAME.log

. ../config/test.alarm.cfg

RUSH_HOST=http://localhost:$RUSH_PORT

MANUAL=false

while getopts ":m" opt; do
  case $opt in
    m)
      MANUAL=true
      ;;
    \?)
      echo "Invalid option: -$OPTARG" >&2
      ;;
  esac
done

TEST1=true
TEST2=true
TEST3=true
TEST4=true

red='\e[91m'
endColor='\e[0m'

function stop_redis_wait {
  echo -e "\n Now STOP Redis server at $REDIS_HOST:$REDIS_PORT"
  while nc -z $REDIS_HOST $REDIS_PORT ##Wait until they are both up
  do
    sleep 1
  done
}

function start_redis_wait {
  echo -e "\n Now START Redis server at $REDIS_HOST:$REDIS_PORT"
  until nc -z $REDIS_HOST $REDIS_PORT
  do
    sleep 1
  done
}

function stop_mongo_wait {
  echo -e "\n Now STOP Mongo server at $MONGO_HOST:$MONGO_PORT"
  while nc -z $MONGO_HOST $MONGO_PORT ##Wait until they are both up
  do
    sleep 1
  done
}

function start_mongo_wait {
  echo -e "\n Now START Mongo server at $MONGO_HOST:$MONGO_PORT"
  until nc -z $MONGO_HOST $MONGO_PORT
  do
    sleep 1
  done
}


function kill_servers {
  if nc -z $REDIS_HOST $REDIS_PORT; then
    killall redis-server
  fi
  if nc -z $MONGO_HOST $MONGO_PORT; then
    killall mongod
  fi
  while nc -z $REDIS_HOST $REDIS_PORT || nc -z $MONGO_HOST $MONGO_PORT;
    do
      sleep 1
    done
}

function before {

  rm -rf $LOG ##Remove log file

  if $MANUAL ; then
    start_redis_wait
    start_mongo_wait
  else
    rm -rf mongo
    mkdir mongo
    $REDIS_PATH & ##Start redis-server
    redis_pid=$!
    $MONGO_PATH --dbpath ./mongo --quiet & #Start mongodb
    mongo_pid=$!
    until nc -z $MONGO_HOST $MONGO_PORT && nc -z $REDIS_HOST $REDIS_PORT ##Wait until they are both up
      do
        sleep 1
      done
  fi
}

function after {
  if $MANUAL ; then
    stop_redis_wait
    stop_mongo_wait
  else
    kill $redis_pid #Stop redis
    kill $mongo_pid #Stop mongo
    rm -rf ./mongo #Remove db directories
    while nc -z $REDIS_HOST $REDIS_PORT || nc -z $MONGO_HOST $MONGO_PORT;
      do
        sleep 1
      done
  fi
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
  if $MANUAL ; then
    stop_redis_wait
  else
    kill $redis_pid ##Kill redis
  fi

  beforeEach
  $LISTENER &
  afterEach
  grep -q -e '| lvl=ERROR | op=REDIS CONNECTION | msg=Redis Error |' $LOG
  if [  $? -ne 0 ]; then
    TEST3=false;
  fi

  if $MANUAL ; then
    start_redis_wait
  else
    $REDIS_PATH & #Restart redis
    redis_pid=$!
    until nc -z $REDIS_HOST $REDIS_PORT ##Wait until it is up
    do
      sleep 1
    done
  fi
}

function mongo_unavailable {
  if $MANUAL ; then
    stop_mongo_wait
  else
    kill $mongo_pid ##Kill redis
  fi
  beforeEach
  $LISTENER &
  afterEach
  if $MANUAL ; then
    start_mongo_wait
  else
    $MONGO_PATH --dbpath ./mongo --quiet & #Restart mongo
    mongo_pid=$!
    until nc -z $MONGO_HOST $MONGO_PORT #Wait until it is up
      do
        sleep 1
      done
  fi

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
echo "==================================================================="
echo "               * ALARM TEST *"
echo "==================================================================="
echo ">> CONFIG <<                       "
echo
echo "Configure Rush and Rush components in the config file:"
echo "     - RUSH/config/test.alarm.cfg"
echo "Manual execution: "
echo "     - For for manual steps execution launch the script using -m "
echo "==================================================================="
echo ">> OPTIONS <<                      "
echo
echo -e "\tS: Stop redis-server and mongodb"
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

if [ $option == "S" ]
then
  kill_servers
  exit 0
else
  if nc -z $REDIS_HOST $REDIS_PORT; then
    echo There is an active redis-server instance.
    echo Stop it or run this script with flag -f
    exit 1
  fi

#  if nc -z $MONGO_HOST $MONGO_PORT; then
#    echo There is an active mongod instance.
#    echo Stop it or run this script with flag -f
#    exit 1
#  fi
  menu
fi

exit $return_value




