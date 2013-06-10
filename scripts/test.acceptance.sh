#!/bin/bash
# -*- ENCODING: UTF-8 -*-
# Launch this script from the base path of Rush
echo "// Test Environmnet setup"
SERVICES="mongod redis-server"
RUSH="consumer.js listener.js"


# check if each service is running
for service in $SERVICES
do
  # if current service is running, dont do anything.
  if ps ax | grep -v grep | grep $service > /dev/null
  then
    echo "$service service is running!"
  else # otherwise, turn it on
    echo "$service is not running"
    sudo /etc/init.d/$service start
    if ps ax | grep -v grep | grep $service > /dev/null
    then
      echo "$service is now running."
    else
      echo "Unable to start $service."
    fi
  fi
done

#check Rush is running with at least one agent of consumer and listener
for rush in $RUSH
do
  # if current service is running, dont do anything.
  if ps ax | grep -v grep | grep $rush > /dev/null
  then
    echo "$rush service is running!"
  else # otherwise, turn it on
    echo "$rush is not running"
     node lib/$rush &
    if ps ax | grep -v grep | grep $rush > /dev/null
    then
      echo "$rush is now running."
    else
      echo "Unable to start $rush."
    fi
  fi
done

# mongod
# usr/sbin/mongod
# redis-server
# node lib/consumer.js &
# node lib/listener.js &
echo " // Test execution starting: "
echo "+++++++++++++++++++++++++++++"
echo " "
grunt test
exit
