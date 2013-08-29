
CERT_PATH=../utils/server.crt
KEY_PATH=../utils/server.key

LISTENER=../bin/listener
LOG=Rush_listener_$HOSTNAME.log


RUSH_HOST=http://localhost:5001

function before {
  rm -rf mongo
  mkdir mongo
  rm -rf $LOG
  redis-server & > /dev/null
  redis_pid=$!
  mongod --dbpath ./mongo --quiet &
  mongo_pid=$!
  until nc -z localhost 27017 && nc -z localhost 6379
    do
      sleep 1
    done
}

function after {
  kill $redis_pid
  kill $mongo_pid
  rm -rf mongo
}

function beforeEach {
  sleep 3
}

function afterEach {
  sleep 5
  pid=$!
  kill $pid
}

function cert_bak {
  mv -v $CERT_PATH $CERT_PATH.bak
  mv -v $KEY_PATH $KEY_PATH.bak
}

function cert_recover {
  mv -v $CERT_PATH.bak $CERT_PATH
  mv -v $KEY_PATH.bak $KEY_PATH
}

function no_certs_found {
  cert_bak
  beforeEach
  $LISTENER &
  afterEach
  cert_recover
}

function invalid_request {
  $LISTENER &
  beforeEach
  curl -v -H "X-Relayer-Host:nodejs.org" -H "X-relayer-persistence: INVALID_PERSISTENCE" $RUSH_HOST
  afterEach
}

function redis_unavailable {
  kill $redis_pid
  beforeEach
  $LISTENER &
  afterEach
  redis-server & > /dev/null
  redis_pid=$!
  until nc -z localhost 6379
  do
    sleep 1
  done
}

function mongo_unavailable {
  kill $mongo_pid
  beforeEach
  $LISTENER &
  afterEach
  mongod --dbpath ./mongo --quiet &
  mongo_pid=$!
  until nc -z localhost 27017
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

grep -q -e '| lvl=WARNING | op=LISTENER START UP | msg=Certs Not Found |' $LOG
if [  $? -ne 0 ]; then
  echo "Scenario 1: Should log Certs not found error"
  return_value=1
fi
grep -q -e '| lvl=WARNING | op=ASSIGN REQUEST | msg=Request Error |' $LOG
if [  $? -ne 0 ]; then
  echo "Scenario 1: Should log Request Error"
  return_value=1
fi
grep -q -e '| lvl=ERROR | op=REDIS CONNECTION | msg=Redis Error |' $LOG
if [  $? -ne 0 ]; then
  echo "Scenario 1: Should log Redis Error"
  return_value=1
fi
grep -q -e '| lvl=WARNING | op=INIT EVENT LISTENER | msg=Could not connect with MongoDB |' $LOG
if [  $? -ne 0 ]; then
  echo "Scenario 1: Should log Could not connect with MongoDB"
  return_value=1
fi
grep -q -e '| lvl=ERROR | op=ADD-ONS START UP | msg=Error subscribing event listener |' $LOG
if [  $? -ne 0 ]; then
  echo "Scenario 1: Should log Error subscribing event listener"
  return_value=1
fi

exit $return_value


