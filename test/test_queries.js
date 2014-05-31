"use strict";

var fowl = require('../index');
var chai = require('chai');
var Promise = require('bluebird');

var expect = chai.expect;

var root = '__tests__';

fowl.open();

describe("Queries", function(){
  
  before(function(){
    return Promise.join(
      fowl.remove('__ind'),
      fowl.remove(root),
      fowl.remove('animals'),
      fowl.remove('people'),
      fowl.remove('tests'));
  });
  
  after(function(){
    var tr = fowl.transaction();
    tr.remove('animals');
    tr.remove('people');
    tr.remove(root);
    tr.remove(['__ind', root]);
    return tr.commit();
  });
  
  describe("Equality condition", function(){
    it("Find by filtering some property", function(){
      var tr = fowl.transaction();
  
      tr.create([root, 'people'], { name: "John", lastname: "Smith", balance: 50});
      tr.create([root, 'people'], { name: "Lisa", balance: 30});

      tr.find([root, 'people'], {name: "John"}, ['name']).then(function(result){
        expect(result).to.be.an('array');
      });

      return tr.commit()
    });
  
    it("Find one between many documents by filtering some property", function(){
      var tr = fowl.transaction();
  
      //
      // Add many documents
      //
      tr.create([root, 'people'], { name: "Peter", balance: 30});
      tr.create([root, 'people'], { name: "Peter", balance: 45});
    
      for(var i=0; i< 1000; i++){
        tr.create([root, 'people'], { id: i, name: "John", lastname: "Smith", balance: Math.random()});
      }
      
      return tr.commit().then(function(){
        //
        // Lets find Lisa
        //
        var tr = fowl.transaction();
    
        var find = tr.find([root, 'people'], {name: "Peter", balance: 30}, ['name', 'balance']);

        return tr.commit().then(function(){
          find.then(function(result){
            expect(result).to.be.a("array");
            expect(result).to.have.length(1);
            expect(result[0]).to.have.property('balance');
            expect(result[0].balance).to.be.equal(30);
            expect(result[0]).to.have.property('name');
            expect(result[0].name).to.be.equal("Peter");
          });
        });
      });
    });
      
    it("Find by specifying AND conditions");
    it("Find by specifying OR conditions");
    it("Find by specifying AND and OR conditions");
    
    it("Find by specifying a subdocument");
    
    it("Find by exact match on array { tags: [ 'fruit', 'food', 'citrus' ]");
    it("Find by matching one array element {tags: 'fruit' }");

    it("Find one between many documents using an indexed property", function(){
      var keyPath = [root, 'indexedpeople'];
  
      return fowl.addIndex(keyPath, 'name').then(function(){
        var tr = fowl.transaction();
      
        //
        // Add many documents
        //
        tr.create(keyPath, { name: "Peter", balance: 30});
    
        for(var i=0; i< 1000; i++){
          tr.create(keyPath, { id: i, name: "John", lastname: "Smith", balance: Math.random()});
        }
      
        var find = tr.find(keyPath, {name: "Peter"}, ['name', 'balance']);
        
        return tr.commit().then(function(){
          return find.then(function(result){
            expect(result).to.be.a("array");
            expect(result).to.have.length(1);
            expect(result[0]).to.have.property('balance');
            expect(result[0].balance).to.be.equal(30);
            expect(result[0]).to.have.property('name');
            expect(result[0].name).to.be.equal("Peter");
          });
        })
      })
    });
  });
  
  describe("Condition Operators", function(){
    it("equality operator", function(){
      var keyPath = [root, 'people'];
      
      var tr = fowl.transaction();

      //
      // Add many documents
      //
      tr.create(keyPath, { name: "Josh", balance: 30});
      tr.create(keyPath, { name: "Josh", balance: 45});

      for(var i=0; i< 50; i++){
        tr.create(keyPath, { 
          _id: i, 
          name: "John", 
          lastname: "Smith", 
          balance: Math.round(Math.random()*100)});
        }

      return tr.commit().then(function(){
        var time = Date.now();
        var tr = fowl.transaction();
          
        var query = fowl.query(keyPath);

        query
          .eql('name', 'Josh')
          .eql('balance', 30)
        
        var q = query.exec(tr);

        return tr.commit().then(function(){
          return q.then(function(docs){
            expect(docs).to.have.length(1)
            expect(docs[0]).to.have.property('name', 'Josh');
            expect(docs[0]).to.have.property('balance', 30);
          });
        })
      });
    });
      
    it("equality operator using index", function(){
      var keyPath = [root, 'eqlindex', 'people'];

      return fowl.addIndex(keyPath, 'balance').then(function(){

        var tr = fowl.transaction();

        //
        // Add many documents
        //
        tr.create(keyPath, { name: "Josh", balance: 30});
        tr.create(keyPath, { name: "Josh", balance: 45});

        for(var i=0; i< 50; i++){
          tr.create(keyPath, { 
            _id: i, 
            name: "John", 
            lastname: "Smith", 
            balance: Math.round(Math.random()*100)
          });
        }

        return tr.commit().then(function(){
          var time = Date.now();
          var tr = fowl.transaction();
          
          var query = fowl.query(keyPath);

          query
            .eql('balance', 30)
            .eql('name', 'Josh')
              
          var q =query.exec(tr);

          return tr.commit().then(function(){
            return q.then(function(docs){
              expect(docs).to.have.length(1)
              expect(docs[0]).to.have.property('name', 'Josh');
              expect(docs[0]).to.have.property('balance', 30);
            })            
          });
        });
      });
    });
    
    it("Greater than", function(){
      var keyPath = [root, 'people'];
      
      var tr = fowl.transaction();

      //
      // Add many documents
      //
      tr.create(keyPath, {name: "Jim", balance: 30});
      tr.create(keyPath, {name: "Jim", balance: 45});

      for(var i=0; i< 50; i++){
        tr.create(keyPath, { 
          _id: i, 
          name: "John", 
          lastname: "Smith", 
          balance: Math.round(Math.random()*100)
        });
      }

      return tr.commit().then(function(){
        var time = Date.now();
        var tr = fowl.transaction();
          
        var query = fowl.query(keyPath);

        query
          .gt('balance', 30)
          .eql('name', 'Jim')
          
        var q = query.exec(tr);

        return tr.commit().then(function(){
          return q.then(function(docs){
            expect(docs).to.have.length(1)
            expect(docs[0]).to.have.property('name', 'Jim');
            expect(docs[0]).to.have.property('balance', 45);
          })
        })
      });
    });
    
    it("Greater or Equal than", function(){
      var keyPath = [root, 'people'];
      
      var tr = fowl.transaction();

      //
      // Add many documents
      //
      tr.create(keyPath, {name: "Joshua", balance: 30});
      tr.create(keyPath, {name: "Joshua", balance: 45});

      for(var i=0; i< 50; i++){
        tr.create(keyPath, { 
          _id: i, 
          name: "John", 
          lastname: "Smith", 
          balance: Math.round(Math.random()*100)
        });
      }

      return tr.commit().then(function(){
        var time = Date.now();
        var tr = fowl.transaction();
          
        var query = fowl.query(keyPath);

        query
          .gte('balance', 30)
          .eql('name', 'Joshua')
          
        var q = query.exec(tr);
      
        return tr.commit().then(function(){
          return q.then(function(docs){
            expect(docs).to.have.length(2)
            expect(docs[0]).to.have.property('name', 'Joshua');
            expect(docs[0]).to.have.property('balance', 30);
            expect(docs[1]).to.have.property('name', 'Joshua');
            expect(docs[1]).to.have.property('balance', 45);
          });
        })
      });
    });
    
    it("Less than");
    it("Less or equal than");
    it("Not equal ($ne)");
    it("Not in ($nin)");
  });
});