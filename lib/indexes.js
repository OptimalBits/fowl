"use strict";

var util = require('./util');
var _ = require('lodash');
var Promise = require('bluebird');

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
  
  tr.set(packedKey, util.packValue(fdb, value));
}


function _fetchIndex(fdb, iter){
  var defer = Promise.defer();
  var result = {};
  iter.forEach(function(kv, cb) {
    var keyPath = fdb.tuple.unpack(kv.key);
    var id = _.last(keyPath);
    var obj = {_id: id};
    obj[keyPath[keyPath.length-3]] = util.unpackValue(fdb, kv.value);
    result[id] = obj;
    cb();
  }, function(err) {
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
/**
  Reads the index for the given keyPath, field and value.
  Returns a object with all ids populated with the index field
  for the given keypath matching the condition field === value
*/
function readIndex(fdb, tr, keyPath){  
  var key = [PREFIX].concat(keyPath);
  
  var range = fdb.tuple.range(key);
  var iter = tr.getRange(range.begin, range.end);
  
  return _fetchIndex(fdb, iter);
}

//
// Index read for inequalities
//
function readIndexGreater(fdb, tr, keyPath){
  var key = [PREFIX].concat(keyPath);

  var begin = fdb.KeySelector.firstGreaterThan(fdb.tuple.pack(key)).next();
  var range = fdb.tuple.range(_.initial(key));
  
  var iter = tr.getRange(begin, range.end);

  return _fetchIndex(fdb, iter);
}

function readIndexGreaterOrEqual(fdb, tr, keyPath){
  var key = [PREFIX].concat(keyPath);

  var begin = fdb.KeySelector.firstGreaterThan(fdb.tuple.pack(key));
  var range = fdb.tuple.range(_.initial(key));
  
  var iter = tr.getRange(begin, range.end);

  return _fetchIndex(fdb, iter);
}

function readIndexLess(fdb, tr, keyPath){
  var key = [PREFIX].concat(keyPath);
  
  var begin = fdb.KeySelector.firstGreaterThan(fdb.tuple.pack(_.initial(key)))
  var end = fdb.KeySelector.lastLessOrEqual(fdb.tuple.pack(key));
  
  var iter = tr.getRange(begin, end);
  
  return _fetchIndex(fdb, iter);
}

function readIndexLessOrEqual(fdb, tr, keyPath){
  var key = [PREFIX].concat(keyPath);
  
  var begin = fdb.KeySelector.firstGreaterThan(fdb.tuple.pack(_.initial(key)))
  var end = fdb.KeySelector.lastLessOrEqual(fdb.tuple.pack(key)).next();
  
  var iter = tr.getRange(begin, end);
  
  return _fetchIndex(fdb, iter);
}

exports.checkIndex = checkIndex;
exports.makeIndex = makeIndex;
exports.readMeta = readMeta;
exports.writeIndex = writeIndex;
exports.readIndex = readIndex;
exports.readIndexGreater = readIndexGreater;
exports.readIndexGreaterOrEqual = readIndexGreaterOrEqual;
exports.readIndexLess = readIndexLess;
exports.readIndexLessOrEqual = readIndexLessOrEqual;

