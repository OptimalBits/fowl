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

Query.prototype.applyOperator = function(tr, index, fns, args, docs){
  var keyPath = this.keyPath;
  if(docs){
    //
    // Populate if needed
    //
    var ids = [];
    _.each(docs, function(doc){
      if(!(args[0] in doc)){
        ids.push(doc._id);
      }
    });
    
    return when.all(_.map(ids, function(id){
      return tr.get(keyPath.concat(id));
    })).then(function(populatedDocs){
      //
      // Filter
      //
      return fns.filter(docs, args).concat(fns.filter(populatedDocs, args));
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
  
  for(var i = 0; i < cmds.length; i++){
    var cmd = cmds[i];
    tasks.push(_.bind(this.applyOperator, this, tr, tr.index, cmd.fns, cmd.args));
  }
  
  return pipeline(tasks).then(function(docs){
    return _this.fields ? _.map(docs, function(doc){
      // populate(keyPath, doc, fields)
      return _.pick(doc, _this.fields);
    }) : docs;
  });
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

function filter(x, fn){

}


module.exports = Query;


