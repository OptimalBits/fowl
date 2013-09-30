"use strict";

function find(keyPath, filter, fields, options){
  // if Keypath points to a collection:
  // getRange will give us all tuples from all the properties of every
  // document in the collection, how can be split the tuples into different
  // documents? easy, the first key after the keyPath must be the first key of 
  // a document. We can first create a huge document and then split it in
  // an array of documents. Should work as first approach...
  
}

export.module = find;
