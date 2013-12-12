"use strict";

var fowl = require('../index');
var chai = require('chai');

var expect = chai.expect;

var root = '__tests__';

fowl.open();

describe("Top Level", function(){
  
  before(function(done){
    fowl.remove('__ind');
    fowl.remove(root);
    fowl.remove('animals');
    fowl.remove('people');
    fowl.remove('tests').then(function(){
      done();
    });
  });
  
  after(function(done){
    var tr = fowl.transaction();
    tr.remove('animals');
    tr.remove('people');
    tr.remove(root);
    tr.remove(['__ind', root]);
    tr.commit().then(function(){
      done();
    })
  });
  
  it("Create", function(done){
    fowl.create('animals', {name: 'fox', legs: 4}).then(function(foxId){
      expect(foxId).to.be.a('string');
      fowl.get(['animals', foxId]).then(function(fox){
        expect(fox).to.be.a('object');
        expect(fox).to.have.property('name');
        expect(fox).to.have.property('legs');
        expect(fox.name).to.be.eql('fox')
        expect(fox.legs).to.be.eql(4)
        done();
      });
    });
  });
  
  it("Update document", function(done){  
    fowl.create('animals', {name: 'tiger', legs: 4}).then(function(tigerId){
      expect(tigerId).to.be.a('string');
    
      fowl.put(['animals', tigerId], {legs: 3});
    
      fowl.get(['animals', tigerId]).then(function(tiger){
        expect(tiger).to.have.property('name');
        expect(tiger).to.have.property('legs');
        expect(tiger.name).to.be.eql('tiger')
        expect(tiger.legs).to.be.eql(4)
      });
      done();
    });
  });
  
  it("Remove document", function(done){  
    fowl.create([root, 'animals'], {name: 'fox', legs: 4}).then(function(docId){
    
      fowl.remove([root, 'animals', docId]).then(function(){
        fowl.get([root, 'animals', docId]).then(function(doc){
          expect(doc).to.be.a('undefined');
          done();
        });
      });
    });
  });
  
  it("Find by filtering some property", function(done){
    fowl.create([root, 'people'], { name: "John", lastname: "Smith", balance: 50}).then(function(){
      fowl.create([root, 'people'], { name: "Lisa", balance: 30}).then(function(){
        fowl.find([root, 'people'], {name: "John"}, ['name']).then(function(result){
          expect(result).to.be.an('array');
          expect(result.length).to.be.eql(1);
          done();
        });
      })
    })
  });
  
});
