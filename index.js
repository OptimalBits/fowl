"use strict";

var fdb = require('fdb').apiVersion(100);
var _ = require('lodash');

var indexes = require('./lib/indexes');
var Transaction = require('./lib/transaction');


//
// Globals
//
var db;
var indexMeta = {};

function transaction(){
  return new Transaction(fdb, db, indexMeta);
}

exports.open = function(clusterFile, dbName)
{
  db = fdb.open(clusterFile, dbName);
  
  var tr = transaction();
  indexes.readMeta(tr).then(function(meta){
    indexMeta = meta || {};
  });
  tr.commit();
}

exports.options = fdb.options;
exports.transaction = transaction;

/**
  Add a index
*/
exports.addIndex = function(keyPath, fields)
{
  fields = _.isArray(fields) ? fields : [fields];
  var tr = transaction();
  for(var i=0; i<fields.length; i++){
    indexes.makeIndex(tr, keyPath, fields[i]);
    indexMeta[keyPath.join('/')] = true;
  }
  return tr.commit();
}

/**
  Rebuilds a index.
*/
exports.rebuildIndex = function(keyPath, fields)
{
  // TO IMPLEMENT
}

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
  return tr.commit();
}

