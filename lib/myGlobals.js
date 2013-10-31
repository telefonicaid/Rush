//Copyright 2012 Telefonica Investigación y Desarrollo, S.A.U
//
//This file is part of RUSH.
//
//  RUSH is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public
//  License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later
//  version.
//  RUSH is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty
//  of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
//
//  You should have received a copy of the GNU Affero General Public License along with RUSH
//  . If not, seehttp://www.gnu.org/licenses/.
//
//For those usages not covered by the GNU Affero General Public License please contact with::dtc_support@tid.es

exports.C = {
  'STATE_COMPLETED': 'completed',
  'STATE_QUEUED': 'queued',
  'STATE_PENDING': 'pending',
  'STATE_PROCESSING': 'processing',
  'STATE_ERROR': 'error',
  'STATE_RETRY_FAIL': 'retry_fail',
  'STATE_CALLBACK': 'callback_state',
  'STATE_ONERR_CALLBACK': 'on_err_callback_state',
  'STATE_PERSISTENCE': 'persistence_state',
  'STATUS_OK': '200',
  'STATUS_ERROR': '404',
  'STATUS_WEIRD': '500',
  'HEAD_RELAYER_HOST': 'x-relayer-host',
  'HEAD_RELAYER_RETRY': 'x-relayer-retry',
  'HEAD_RELAYER_HTTPCALLBACK': 'x-relayer-httpcallback',
  'HEAD_RELAYER_HTTPCALLBACK_ERROR': 'x-relayer-httpcallback-error',
  'HEAD_RELAYER_PERSISTENCE': 'x-relayer-persistence', //STATUS, HEAD, CONTENT
  'HEAD_RELAYER_TRACEID': 'x-relayer-traceid',
  'HEAD_RELAYER_ENCODING': 'x-relayer-encoding',
  'HEAD_RELAYER_PROXY': 'x-relayer-proxy',
  'HEAD_RELAYER_PROTOCOL': 'x-relayer-protocol', //http, https
  'HEAD_RELAYER_SERVER_CERT': 'x-relayer-server-cert', //target certificate
  'HEAD_RELAYER_HEADER': 'x-relayer-header', //extra header for target
  'ACEPTS_ENCODINGS': ['base64'],
  'PARAM_DBHOST': 'dbhost',
  'PARAM_DBPORT': 'dbport',
  'PARAM_SPAWN': 'spawn',
  'PARAM_DEBUG': 'debug',
  'PARAM_HELP': 'help',
  'RD_STATE': 'State',
  'RD_HEADER': 'Header',
  'RD_STATUSCODE': 'StatusCode',
  'RD_DATA': 'Data',
  'RD_METHOD': 'Method',
  'RD_POSTDATA': 'Postdata',
  'RD_RELAYED_REQUEST': 'RelayedRequest',
  'EVENT_NEWSTATE': 'newstate',
  'EVENT_ERR': 'failure',
  'MAX_PORT': 65535,
  'MAX_TIMEOUT': 60000,

  //Accepted values
  'ACCEPTED_PERSISTENCE' : ['BODY', 'STATUS', 'HEADER'],
  'ACCEPTED_PROTOCOLS' : ['http', 'https'],

  //ERRORS
  'SERVER_ERROR': 'server_error',
  'MISSING_PARAMETER': 'missing_parameter',
  'INVALID_PARAMETER': 'invalid_parameter',
  'INVALID_PARAMETER_ACCEPTED_VALUES': 'invalid_parameter_accepted_values',
  'UNKNOWN_RESOURCE': 'unknown_resource',
  'NOT_IMPLEMENTED': 'not_implemented'
};

