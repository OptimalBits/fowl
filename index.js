var Transaction = require('./lib/transaction');
var query = require('.lib/query');

function transaction(){
  return new Transaction()
}

export.module.transaction = transaction;
export.module.query = query;
