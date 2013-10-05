"use strict";

var when = require('when');
var _ = require('lodash');
var uuid = require('node-uuid');

var Transaction = function(fdb, db){
  this.fdb = fdb;
  this.db = db;
  this.operations = [];
}

/**
  Creates a document in the given keypath.
  
*/
Transaction.prototype.create = function(keyPath, args)
{
  if(_.isString(keyPath)){
    keyPath = [keyPath];
  };
  var id = args._id ? args._id : uuid.v1();
  return this.put(keyPath.concat(id), _.extend({_id: id}, args)).then(function(){
    return id;
  });
}

/**
  Updates a document in the given keypath.
*/
Transaction.prototype.put = function(keyPath, args)
{
  var _this = this;
  
  if(_.isString(keyPath)){
    keyPath = [keyPath];
  };
  
  var defer = when.defer();
  
  this.operations.push(function(tr){
    var tuples = makeTuples(keyPath, args);
    _.each(tuples, function(tuple){
      var key = _this.fdb.tuple.pack(_.initial(tuple));
      var value = packValue(_this.fdb, _.last(tuple));

      tr.set(key, value);
    });
    defer.resolve();
    return defer.promise;
  });
  return defer.promise;
}

/**
  Returns a promise with the object at the given keypath (if any)
*/
Transaction.prototype.get = function(keyPath, fields)
{
  var _this = this;
  var fdb = this.fdb;
  if(_.isString(keyPath)){
    keyPath = [keyPath];
  };
  
  var defer = when.defer();
  
  this.operations.push(function(tr){
    var range = fdb.tuple.range(keyPath);
    var iter = tr.getRange(range.begin, range.end);
    var result;
    
    iter.forEach(function(kv, cb) {
      var tuple = fdb.tuple.unpack(kv.key);
      result = result ? result : _.isNumber(_.last(tuple)) ? [] : {};
      
      tuple.push(unpackValue(fdb, kv.value));
      fromTuple(result, tuple.slice(keyPath.length));
      cb();
    }, function(err, res) {
      if(err){
        defer.reject(err);
      }else{
        defer.resolve(_.isEmpty(result) ? undefined: result);
      }
    })
    return defer.promise;
  });
  
  return defer.promise;
}

Transaction.prototype.remove = function(keyPath)
{
  var _this = this;
  if(_.isString(keyPath)){
    keyPath = [keyPath];
  };
  
  this.operations.push(function(tr){
    var range = _this.fdb.tuple.range(keyPath);
    tr.clearRange(range.begin, range.end);
    return when.resolve();
  });
  return this;
}

Transaction.prototype.find = function find(keyPath, where, fields, options){
  return this.get(keyPath).then(function(docs){
    docs = _.filter(docs, where);
    // Filter them _.pick
    return fields ? _.map(docs, function(doc){
      return _.pick(doc, fields);
    }) : docs;
  });
}

Transaction.prototype.processOperations = function(tr, index)
{
  var _this = this;
  var results = [];
  var operations = this.operations;
  
  var task, i = index || 0;

  try{
    while(task = operations[i]) {
      results.push(task(tr));
      i++;
    }
  }catch(err){
    console.log(err);
    return when.reject(err);
  }

  return when.all(results).then(function(){
    if(operations[i]){
      return _this.processOperations(tr, i);
    }
  });
}

Transaction.prototype.commit = function()
{
  var defer = when.defer();
  var _this = this;
  
  this.db.doTransaction(function(tr, cb){
    
    _this.processOperations(tr).then(function(){
      cb()
    }, cb);
    
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
  traverseToTuple(result, prefix, args)
  return result;
}

function traverseToTuple(result, arr, args){
  if(!_.isObject(args)){
    // Pack primitive
    arr.push(args);
    result.push(arr);
  }else{
    _.each(args, function(value, key){
      traverseToTuple(result, arr.concat(key), value);
    });
  };
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
  for(i=0; i<tuple.length-2; i++){
    if (_.isUndefined(obj[tuple[i]])){
      if(_.isNumber(tuple[i+1])){
        obj[tuple[i]] = [];
      }else{
        obj[tuple[i]] = {};
      }
    }
    obj = obj[tuple[i]];
  }
  obj[tuple[i]] = tuple[i+1];
}

// copyright: 
// https://github.com/leaflevellabs/node-foundationdblayers/blob/master/lib/utils.js
function packValue(fdb, val)
    {
        // string
        if(_.isString(val))
            return fdb.tuple.pack([0, new Buffer(val)]);
        // integer
        else if(_.isNumber(val) && val === Math.floor(val))
            return fdb.tuple.pack([1, val]);
        // decimal
        else if(_.isNumber(val) && val !== Math.floor(val))
            return fdb.tuple.pack([2, new Buffer(val.toString())]);
        // bool
        else if(_.isBoolean(val))
            return fdb.tuple.pack([3, val ? 1 : 0]);
        // dates
        else if(_.isDate(val))
            return fdb.tuple.pack([4, val.getFullYear() ,val.getMonth(), val.getDate(), val.getHours(), val.getMinutes(), val.getSeconds(), val.getMilliseconds()]);

        // array or objects
        else if(_.isArray(val) || _.isObject(val) )
            return fdb.tuple.pack([5, new Buffer(JSON.stringify(val))]);
        else if(val === null || val === undefined)
            return fdb.tuple.pack([6, ""]);
        else
            throw err("the packValue function only accepts string, number, boolean, date, array and object");
    }

  function unpackValue(fdb, val)
    {
        if(!val)
            return null;

        var unpackedval = fdb.tuple.unpack(val);

        // string
        if(unpackedval[0] === 0)
            return unpackedval[1].toString();
        // number
        else if(unpackedval[0] === 1)
            return unpackedval[1];
        // decimal
        else if(unpackedval[0] === 2)
            return parseFloat(unpackedval[1].toString());
        // boolean
        else if(unpackedval[0] === 3)
            return unpackedval[1] === 1;
        // date
        else if(unpackedval[0] === 4)
            return new Date(unpackedval[1], unpackedval[2], unpackedval[3], unpackedval[4], unpackedval[5], unpackedval[6], unpackedval[7]);
        // array or object
        else if(unpackedval[0] === 5)
            return JSON.parse(unpackedval[1].toString());
        else if(unpackedval[0] === 6)
            return null;
        else
            throw err("the type (" + unpackedval[0] + ") of the passed val is unknown");
    }



module.exports = Transaction;

