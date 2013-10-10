"use strinct";
var _ = require('lodash');

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

exports.packValue = packValue;
exports.unpackValue = unpackValue;