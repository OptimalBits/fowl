"use strict";

var fowl = require('../index');
var chai = require('chai');

var expect = chai.expect;

fowl.open();

describe("Basic operations", function(){
  it("Create document", function(done){
    var tr = fowl.transaction();

    tr.create('animals', {name: 'fox', legs: 4}).then(function(foxId){
      expect(foxId).to.be.a(String);
      tr.get(['animals', foxId]).then(function(fox){
        expect(fox).to.be.an(Object);
        expect(fox).to.have.property('name');
        expect(fox).to.have.property('legs');
        expect(fox.name).to.be('fox')
        expect(fox.legs).to.be(4)
      });
    });
    
    tr.commit().then(function(){
      done();
    })
  });
  
  it("Update document", function(done){
    var tr = fowl.transaction();
    
    tr.create('animals', {name: 'tiger', legs: 4}).then(function(tigerId){
      expect(foxId).to.be.a(String);
      
      tr.put(['animals', tigerId], {legs: 3});
      
      tr.get(['animals', tigerId]).then(function(tiger){
        expect(tiger).to.have.property('name');
        expect(tiger).to.have.property('legs');
        expect(tiger.name).to.be('fox')
        expect(tiger.legs).to.be(4)
      })
    });
    
    tr.commit().then(function(){
      done();
    })
  });
  
  it("Remove document", function(done){
    var tr = fowl.transaction();
    
    tr.create('animals', {name: 'fox', legs: 4}).then(function(docId){
      
      tr.remove(['animals', docId]);

      tr.get(['animals', docId]).then(function(doc){
        expect(doc).not.to.be.ok();
      })
    });
    
    tr.commit().then(function(){
      done();
    })
  });
  
  it("Update two documents in the same transaction", function(done){
    var tr = fowl.transaction();
  
    tr.create('people', {_id: 1, name: "John", balance: 50});
    tr.create('people', {_id: 2, name: "Lisa", balance: 30});

    tr.get(['people', 1], ['balance']).then(function(john){
      john.balance -= 10;
      tr.put(['people', 1], {balance: john.balance});
    });
    
    tr.get(['people', 2], ['balance']).then(function(lisa){
      lisa.balance += 10;
      tr.put(['people', 2], {balance: lisa.balance});
    });
    
    tr.commit();

    fowl.get(['people', 1]).then(function(john){
      expect(john.balance).to.be.equal(40);
    })
    
    fowl.get(['people', 2]).then(function(lisa){
      expect(lisa.balance).to.be.equal(40);
      done();
    })
  })
  it("An stored array should be read as an array", function(done){
    var tr = fowl.transaction();
    
    tr.create('tests', {
      _id: 'array', 
      cars: ['lotus', 'ferrari', 'red bull', 'mercedes', 'renault']});
      
    tr.get(['tests', 'array', 'cars']).then(function(cars){
      expect(cars).to.have.length(5);
      expect(cars[0]).to.be.equal('lotus');
      expect(cars[1]).to.be.equal('ferrari');
      expect(cars[2]).to.be.equal('red bull');
      expect(cars[3]).to.be.equal('mercedes');
      expect(cars[4]).to.be.equal('renault');
      done();
    });
    
    tr.commit();
  })
  
  it("Find by filtering some property", function(done){
    var tr = fowl.transaction();
    
    tr.create('people', { name: "John", lastname: "Smith", balance: 50});
    tr.create('people', { name: "Lisa", balance: 30});
  
    tr.find('people', {name: "John"}, ['name']).then(function(result){
      expect(result).to.be.an(Array);
    });
  
    tr.commit().then(function(){
      done();
    })
  })
 
});


