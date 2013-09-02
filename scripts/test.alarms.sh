
CERT_PATH=../utils/server.crt
KEY_PATH=../utils/server.key

LISTENER=../bin/listener
LOG=Rush_listener_$HOSTNAME.log


RUSH_HOST=http://localhost:5001

VERBOSE=false
FORCE=false

while getopts vf option; do
    case "${option}"
    in
      v) VERBOSE=true;;
      f) FORCE=true;;
    esac
  done

echo $FORCE

if $FORCE  ##Kill mongo and redis if there is some
then
  killall redis-server
  killall mongod
  while nc -z localhost 6379 || nc -z localhost 27017;
    do
      sleep 1
    done

else ##Stop if there is active servers otherwise
  if nc -z localhost 6379; then
    echo There is an active redis-server instance.
    echo Stop it or use --force
    exit 1
  fi

  if nc -z localhost 27017; then
    echo There is an active mongod instance.
    echo Stop it or run this script with flag -f
    exit 1
  fi
fi

function before {
  rm -rf mongo
  mkdir mongo
  rm -rf $LOG ##Remove log file
  redis-server & ##Start redis-server
  redis_pid=$!
  mongod --dbpath ./mongo --quiet & #Start mongodb
  mongo_pid=$!
  until nc -z localhost 27017 && nc -z localhost 6379 ##Wait until they both are up
    do
      sleep 1
    done
}

function after {
  kill $redis_pid #Stop redis
  kill $mongo_pid #Stop mongo
  rm -rf ./mongo #Remove db directories
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
}

function invalid_request {
  $LISTENER &
  beforeEach
  curl -v -H "X-Relayer-Host:nodejs.org" -H "X-relayer-persistence: INVALID_PERSISTENCE" $RUSH_HOST #nvalid persistence, should be logged
  afterEach
}

function redis_unavailable {
  kill $redis_pid ##Kill redis
  beforeEach
  $LISTENER &
  afterEach
  redis-server & #Restart redis
  redis_pid=$!
  until nc -z localhost 6379 ##Wait until it is up
  do
    sleep 1
  done
}

function mongo_unavailable {
  kill $mongo_pid #Kill mongo
  beforeEach
  $LISTENER &
  afterEach
  mongod --dbpath ./mongo --quiet & #Restart mongo
  mongo_pid=$!
  until nc -z localhost 27017 #Wait until it is up
    do
      sleep 1
    done
}

before

no_certs_found
invalid_request
redis_unavailable
mongo_unavailable

after

return_value=0


##Check log file

grep -q -e '| lvl=WARNING | op=LISTENER START UP | msg=Certs Not Found |' $LOG
if [  $? -ne 0 ]; then
  echo "Scenario 1: Should log Certs not found error"
  return_value=1
fi
grep -q -e '| lvl=WARNING | op=ASSIGN REQUEST | msg=Request Error |' $LOG
if [  $? -ne 0 ]; then
  echo "Scenario 2: Should log Request Error"
  return_value=1
fi
grep -q -e '| lvl=ERROR | op=REDIS CONNECTION | msg=Redis Error |' $LOG
if [  $? -ne 0 ]; then
  echo "Scenario 3: Should log Redis Error"
  return_value=1
fi
grep -q -e '| lvl=WARNING | op=INIT EVENT LISTENER | msg=Could not connect with MongoDB |' $LOG
if [  $? -ne 0 ]; then
  echo "Scenario 4: Should log Could not connect with MongoDB"
  return_value=1
fi
grep -q -e '| lvl=ERROR | op=ADD-ONS START UP | msg=Error subscribing event listener |' $LOG
if [  $? -ne 0 ]; then
  echo "Scenario 5: Should log Error subscribing event listener"
  return_value=1
fi

exit $return_value


