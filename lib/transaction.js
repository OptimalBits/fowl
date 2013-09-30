"use strict";

var when = require('when');
var fdb = require('fdb');
var lodash = require('lodash');
var uuid = require('node-uuid');

var Transaction = function(db){
  this.db = db;
  this.operations = [];
}

/**
  Creates a document in the given keypath.
  
*/
Transaction.prototype.create = function(keyPath, args)
{
  return this.put(keyPath, _.extend({_id: uuid.v1()}, args));
}

/**
  Updates a document in the given keypath.
*/
Transaction.prototype.put = function(keyPath, args)
{
  this.operations.push(function(tr){
    var tuples = makeTuples(keyPath, args);
    _.each(tuples, function(tuple){
      var key = fdb.tuple.pack(tuple);
      tr.set(key);
    });
    return when.resolve(args._id);
  });
  return this;
}

/**
  Returns a promise with the object at the given keypath (if any)
*/
Transaction.prototype.get = function(keyPath, fields)
{
  var defer = when.defer();
  
  this.operations.push(function(tr){
    var range = fdb.tuple.range(keyPath);
    var iter = tr.getRange(range);
    var result = {};
    
    iter.forEach(function(kv, cb) {
      console.log(kv.key, kv.value);
      fromTuple(result, kv.key);
      cb();
    }, function(err, res) {
      if(err){
        defer.reject(err);
      }else{
        defer.resolve(result);
      }
    })
    return defer.promise;
  });
  
  return defer.promise;
}

Transaction.prototype.remove = function(keyPath)
{
  this.operations.push(function(tr){
    var range = fdb.tuple.range(keyPath);
    tr.clearRange(fdb.tuple.pack(keyPath));
    return when.resolve();
  });
  return this;
}

Transaction.prototype.commit = function()
{
  var defer = when.defer();
  
  this.db.doTransaction(function(tr, cb){
    
    var results = [];
    _.each(this.operations, function(op){
      results.push(op(tr));
    });
    
    when.all(results).then(function(){
      cb();
    }, function(err){
      cb(err);
    })    
  }, function(err, res){
    if(err){
      defer.reject(err);
    }else{
      defer.resolve(res);
    }
  });
  
  return defer.promise;
}

/**
  Creates an array of tuples from a given object.
*/
function makeTuples(prefix, args){
  var result = [];
  _.each(args, function(value, key){
    result.push(prefix.concat(traverseToTuple(args)));
  });
  return result;
}

function traverseToTuple(args){
  if(_.isPlainObject(args)){
    _.each(args, function(value, key){
      packer(value).unshift(key);
    });
  }else if(_.isArray(args)){
    // pack array
  }else{
    return [args];
  }
}

/**
  Creates an object from an array of tuples
*/
function makeObject(tuples){
  var result = {};

  _.each(tuples, function(tuple){
    fromTuple(result, tuple);
  });

  return result;
}

function fromTuple(obj, tuple){
  var i;
  for(i=0; i<tuple.length-1; i++){
    if (_.isUndefined(obj[tuple[i]])){
      obj[tuple[i]] = {};
    }
    obj = obj[tuple[i]];
  }
  obj[i] = tuple[i];
}


exports.module = Transaction;

