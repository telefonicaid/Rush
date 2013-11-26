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

var fs = require('fs');

var stream = fs.createWriteStream(process.argv[2], {flags : 'a'});
process.on('uncaughtException', function(err){
  console.log(err);
  process.send(err);
});
var ok = true;
var buffer = "";

var write = function(data){
  if(!ok){
    buffer += data;
    changeState();
  } else {
    buffer = "";
  }
  ok = stream.write(data);
}

process.on('message', function(message){
  write(message);
});

function changeState(){
  stream.once('drain', function(){
    ok = true;
    write(buffer);
  });
}

