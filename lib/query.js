"use strict";
var 
  indexes = require('./indexes'),
  _ = require('lodash'),
  when = require('when'),
  pipeline = require('when/pipeline');

/**
  Query
  
  Creates a query that can be run on trasaction.
  
  opts: 
  - sort: 'asc', 'desc'
  - limit: max number of items to return.
  - skip: skip number of items.
*/
var Query = function Query(keyPath, fields, opts){
  if(_.isPlainObject(fields)){
    opts = fields;
    fields = null;
  }
  this.fields = fields;
  this.opts = opts || {};
  this.keyPath = _.isArray(keyPath) ? keyPath : [keyPath];
  this.cmds = [];
  this.selected = []; // selected fields
}

Query.prototype._addCmd = function(name, fns, args){
  this.cmds.push({
    cmd: name,
    fns: fns,
    args: args
  });
  return this;
}

//
// Simple query operators
//
var simpleOps = {
  eql: {
    filter: function(docs, args){
      var where = {}
      where[args[0]] = args[1];
      return _.filter(docs, where);
    },
    readIndex: indexes.readIndex
  },
  
  // TODO: Implement neql. We need a special readIndexNotEqual for this.
  neql: function(){},
  
  gt: {
    filter: function(docs, args){
      var key = args[0], val = args[1];
      return _.filter(docs, function(doc){
        return doc[key] > val;
      });
    },
    readIndex: indexes.readIndexGreater
  },
  
  gte: {
    filter: function(docs, args){
      var key = args[0], val = args[1];
      return _.filter(docs, function(doc){
        return doc[key] >= val;
      });
    },
    readIndex: indexes.readIndexGreaterOrEqual
  },
  
  lt: {
    filter: function(docs, args){
      var key = args[0], val = args[1];
      return _.filter(docs, function(doc){
        return doc[key] < val;
      });
    },
    readIndex: indexes.readIndexLess
  },
  
  lte: {
    filter: function(docs, args){
      var key = args[0], val = args[1];
      return _.filter(docs, function(doc){
        return doc[key] <= val;
      });
    },
    readIndex: indexes.readIndexLessOrEqual
  }
};

/**
  Generic operator applier. It delegates to the operator fns.filter and
  fns.readIndex function to perform the query.
*/
Query.prototype.applyOperator = function(tr, index, fns, args, populated, docs){
  var keyPath = this.keyPath;
  if(docs){
    //
    // Populate if needed
    //    
    // TODO: Only get the whole document if not having an index for the 
    // required field.
    return when.all(_.map(docs, function(doc){
      var id = doc._id;
      if(!(args[0] in doc) && _.indexOf(populated, id) === -1){
        populated.push(id);
        return tr.get(keyPath.concat(id));
      }
      return when.resolve(doc);
    })).then(function(docs){
      //
      // Filter
      //
      return fns.filter(docs, args);
    });
  }else{
    var tuple = keyPath.concat([args[0]]);
    if(indexes.checkIndex(index, tuple)){
      var defer = when.defer();
      tr.operations.push(function(tr, fdb){
        tuple.push(args[1]);
        defer.resolve(fns.readIndex(fdb, tr, tuple));
        return defer.promise;
      });
      this.selected.push(args[0]);
      return defer.promise;
    }else{
      return tr.get(keyPath).then(function(docs){
        _.each(docs, function(doc){
          populated.push(doc._id);
        });
        return fns.filter(docs, args);
      });
    }
  }
}

for(var op in simpleOps){
  (function(op){
    Query.prototype[op] = function(field, value){
      return this._addCmd(op, simpleOps[op], [field, value]);
    }
  })(op);
}

Query.prototype.exec = function(tr){
  var _this = this;
  var tasks = [];
  var cmds = this.cmds;
  var populated = [];
  
  for(var i = 0; i < cmds.length; i++){
    var cmd = cmds[i];
    tasks.push(_.bind(this.applyOperator, this, tr, tr.index, cmd.fns, cmd.args, populated));
  }
  
  return pipeline(tasks).then(function(docs){
    return populate(tr, _this.keyPath, docs, _this.fields, populated);
  }).then(function(docs){
    return _this.fields ? _.map(docs, function(doc){
      return _.pick(doc, _this.fields);
    }) : docs;
  });
}

/**
  We only populate the documents that have not already been populated or that
  do not contain all the required fields.
*/
function populate(tr, keyPath, docs, fields, populated){
  return when.all(_.map(docs, function(doc){
    if((_.indexOf(populated, doc._id) === -1) && (!fields || !hasAllFields(doc, fields))){
      return tr.get(keyPath.concat(doc._id));
    }
    return when.resolve(doc);
  }))
}

function hasAllFields(doc, fields){
  for(var i=0; i<fields.length; i++){
    if(!_.has(doc, fields[i])){
      return false;
    }
  }
  return true;
}


/**
  Intersects two objects (keeps the intersection of the keys), it assumes
  that two identical keys have two identical values.
*/
function intersect(a, b){
  var c = {};
  var keys = Object.keys(a);
  for(var key in keys){
    if(key in b){
      c[key] = a[key];
    }
  }
  return c;
}

module.exports = Query;


