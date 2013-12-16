#  GETTING STARTED

## Instalation Guide (Basic)

In order to install Rush (as a component), you should follow the next steps:

1. Download one stable [version](https://github.com/telefonicaid/Rush/tags)
2. After that, you need to install Rush dependencies. To do this, you have to execute the following command in your project directory:
```
npm install --production
```
3. Then you have to set up the databases editing the config file located in `/src/configBase.js`. Redis location and MongoDB location (if used) must be set. 
4. Once, you have set Redis hostname, you have to run it. Go to the **source folder** of your Redis installation and execute the following command:
```
./redis-server
```
5. If the databases are running you are able to start Rush. First of all, run a listener instance which will receive all the petitions. Then, run one or more consumer instances which will process all the requests received by the listener:
```
bin/listener.js //Can be executed more than once
bin/consumer.js //Can be executed more than once
```

 