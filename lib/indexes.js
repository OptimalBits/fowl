"use strict";

var util = require('./util');
var _ = require('lodash');
var when = require('when');

var PREFIX = '__ind';

function makeIndex(tr, keyPath, value){
  return tr.put([PREFIX, '__meta'].concat(keyPath), value);
}

function readMeta(tr){
  return tr.get([PREFIX, '__meta']);
}

function writeIndex(fdb, tr, keyPath, id, value){
  var key = [PREFIX].concat(keyPath, [value, id]);
  var packedKey = fdb.tuple.pack(key)
  var value = util.packValue(fdb, id);
  tr.set(packedKey, value);
}

/**
  Reads the index for the given keyPath, field and value.
  Returns an array of all ids for the given keyPath that 
  matches the condition field === value
*/
function readIndex(fdb, tr, keyPath){
  var defer = when.defer();
  
  var key = [PREFIX].concat(keyPath);
  var range = fdb.tuple.range(key);
  var iter = tr.getRange(range.begin, range.end);
  
  var result = [];
  iter.forEach(function(kv, cb) {
    result.push(util.unpackValue(fdb, kv.value));
    cb();
  }, function(err, res) {
    if(err){
      defer.reject(err);
    }else{
      defer.resolve(result);
    }
  });
  
  return defer.promise;
}

function checkIndex(index, keyPath){  
  for(var i=0; i<keyPath.length-1; i++){
    index = index[keyPath[i]];
    if(_.isUndefined(index)){
      return false;
    }
  }
  return index === keyPath[i];
} 

//
// Index read for inequalities
//
function readIndexGreater(fdb, tr, keyPath, field, value){
  var start = fdb.keySelector.firstGreaterThan(fdb.tuple.pack(keyPath));
  var range = fdb.tuple.range(keyPath);
  var iter = tr.getRange(start, range.end);
  
  iter.forEach(function(kv, cb) {
    
  });
}

function readIndexLess(tr, keyPath, field, value){

}

function readIndexGreaterOrEqual(tr, keyPath, field, value){

}

function readIndexLessOrEqual(tr, keyPath, field, value){

}

exports.makeIndex = makeIndex;
exports.readMeta = readMeta;
exports.writeIndex = writeIndex;
exports.readIndex = readIndex;
exports.checkIndex = checkIndex;
