"use strict";

var fdb = require('fdb').apiVersion(200);
var _ = require('lodash');

var indexes = require('./lib/indexes');
var Transaction = require('./lib/transaction');
var Query = require('./lib/query');

//
// Globals
//
var db;
var indexMeta = {};

function transaction(){
  return new Transaction(fdb, db, indexMeta);
}

function query(keyPath, fields, opts){
  return new Query(keyPath, fields, opts)
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
exports.query = query;

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
  Single operations bluebird no transactions needed.
*/
exports.create = function(keyPath, args){
  var tr = transaction();
  var res = tr.create(keyPath, args);
  return tr.commit().then(function(){
    return res;
  });
}

exports.put = function(keyPath, args){
  var tr = transaction();
  var res = tr.put(keyPath, args);
  return tr.commit().then(function(){
    return res;
  });
}
  
exports.get = function(keyPath){
  var tr = transaction();
  var res = tr.get(keyPath);
  return tr.commit().then(function(){
    return res;
  });
}
  
exports.remove = function(keyPath){
  var tr = transaction();
  var res = tr.remove(keyPath);
  return tr.commit().then(function(){
    return res;
  });
}

exports.find = function(keyPath, where, fields, options){
  var tr = transaction();
  var res = tr.find(keyPath, where, fields, options);
  return tr.commit().then(function(){
    return res;
  });
}