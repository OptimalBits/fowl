"use strict";

var fdb = require('fdb').apiVersion(100);
var Transaction = require('./lib/transaction');
//var query = require('./lib/query');
var _ = require('lodash');

var db;

exports.open = function(clusterFile, dbName)
{
  db = fdb.open(clusterFile, dbName);
}

function transaction(){
  return new Transaction(fdb, db);
}

exports.options = fdb.options;
exports.transaction = transaction;

/**
  Single operations when no transactions needed.
*/
exports.create = function(keyPath, args){
  var tr = transaction();
  var res = tr.create(keyPath, args);
  tr.commit();
  return res;
}
  
exports.put = function(keyPath, args){
  var tr = transaction();
  var res = tr.put(keyPath, args);
  tr.commit();
  return res;
}
  
exports.get = function(keyPath){
  var tr = transaction();
  var res = tr.get(keyPath);
  tr.commit();
  return res;
}
  
exports.remove = function(keyPath){
  var tr = transaction();
  var res = tr.remove(keyPath);
  tr.commit();
  return res;
}

