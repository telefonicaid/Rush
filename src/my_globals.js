//
// Copyright (c) Telefonica I+D. All rights reserved.
//
//

exports.C = {
    'STATE_COMPLETED':'completed',
    'STATE_PENDING':'pending',
    'STATE_PROCESSING':'processing',
    'STATE_ERROR':'error',
    'STATE_RETRY_FAIL':'retry_fail',
    'STATE_CALLBACK':'callback_state',
    'STATE_PERSISTENCE':'persistence_state',
    'STATUS_OK':'200',
    'STATUS_ERROR':'404',
    'STATUS_WEIRD':'500',
    'HEAD_RELAYER_HOST':'x-relayer-host',
    'HEAD_RELAYER_RETRY':'x-relayer-retry',
    'HEAD_RELAYER_HTTPCALLBACK':'x-relayer-httpcallback',
    'HEAD_RELAYER_HTTPCALLBACK_ERROR':'x-relayer-httpcallback-error',
    'HEAD_RELAYER_PERSISTENCE' : 'x-relayer-persistence', //STATUS, HEAD, CONTENT
    'PARAM_DBHOST':'dbhost',
    'PARAM_DBPORT':'dbport',
    'PARAM_SPAWN':'spawn',
    'PARAM_DEBUG':'debug',
    'PARAM_HELP':'help',
    'RD_STATE':'State',
    'RD_HEADER':'Header',
    'RD_STATUSCODE':'StatusCode',
    'RD_DATA':'Data',
    'RD_METHOD':'Method',
    'RD_POSTDATA':'Postdata',
    'RD_RELAYED_REQUEST':'RelayedRequest',
    'EVENT_NEWSTATE': 'newstate',
    'EVENT_ERR' : 'error'
};

