"use strict";

var Benchmark = require('benchmark');
var fowl = require('./index');
var when = require('when');

fowl.open();

var suite = new Benchmark.Suite;

var mediumSize = {
  name: 'John',
  lastname: 'Smith',
  address: 'Papegoya gatan 17',
  city: 'Lomma',
  country: 'Sweden',
  balance: 500000,
  interests: ['scuba diving', 'biking', 'reading', 'movies']
}

console.log("Running Benchmark")
var NUM_OBJECTS = 10000;
suite
  .add('Create small objects, one per transaction', function(defer){
    createObjects({
      name: 'foo',
      bar: 'baz'
    }).then(function(){
      defer.resolve();
    })
  }, {defer:true})
  .add('Create small objects, one transaction', function(defer){
    createObjectsOneTransaction({
      name: 'foo',
      bar: 'baz'
    }).then(function(){
      defer.resolve();
    });
  }, {defer:true})
  .add('Create medium objects, one per transaction', function(defer){
    createObjects(mediumSize).then(function(){
      defer.resolve();
    });
  })
  .add('Create medium objects, one transaction', function(defer){
    createObjects(mediumSize).then(function(){
      defer.resolve();
    });
  })
  
  /*
  .add('Create large objects, one per transaction', function(defer){
  
  })
  
  .add('Create large objects, one transaction', function(defer){
  
  })
  */
  
  .on('start', function(event){
    console.log("Starting benchmark: "+event.target.name);
  })
  .on('cycle', function(event){
    console.log(event.target.name, 
                "Mean: "+Math.round(event.target.stats.mean*1000)+'ms', 
                "Variance: "+Math.round(event.target.stats.variance*1000)+'ms');
  })
  .on('complete', function(){
    console.log("All benchmarks completed");
  })
  .run();


function createObjects(data){
  var ops = []
  
  for(var i=0; i<NUM_OBJECTS; i++){
    ops.push(fowl.create('benchmarks', data));
  }
  
  return when.all(ops)
}

function createObjectsOneTransaction(data){
  var tr = fowl.transaction();
  
  for(var i=0; i<NUM_OBJECTS; i++){
    tr.create('benchmarks', data);
  }
  
  return tr.commit();
}



