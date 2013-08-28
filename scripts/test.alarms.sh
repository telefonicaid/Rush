
CERT_PATH=../utils/server.crt
KEY_PATH=../utils/server.key

LISTENER=../bin/listener
LOG=Rush_listener_$HOSTNAME.log


RUSH_HOST=http://localhost:5001

function before {
  mkdir mongo
  rm -rf $LOG
  redis-server & > /dev/null
  redis_pid=$!
  mongod --dbpath ./mongo --quiet &
  mongo_pid=$!
  until nc -z localhost 27017
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
  sleep 10
  afterEach
  redis-server & > /dev/null
  redis_pid=$!
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

grep -q -e '| lvl=WARNING | op=LISTENER START UP | msg=Certs Not Found |' $LOG
echo $?


