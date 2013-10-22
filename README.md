#Fowl - NodeJS Document and Query Layer for FDB

A NodeJS Layer for FoundationDB that provides documents and queries
with similar capabilities to MongoDB but providing support for 
multidocument transactions.

Transaction support is an incredile powerful feature that simplifies
server logic and helps avoiding difficult to solve race conditions.

Fowl provides a low level API based on keypaths for describing documents and its
properties following CRUD semantics.

Fowl aims to be a low level document layer that can be used by other to provide
higher level features such as schemas, models, validation, etc.

All asynchronous operations return A+ compliant promises (provided by whenjs).

##Contribute

Do you like Fowl and want to bring it up to the next level? Do not hesitate to
clone the project and start contributing to it! :)

##Install

```
npm install fowl
```

##Test

```
npm test
```

##Features
- Clean API based on promises
- Complete transaction support for all available operations.
- Supports: create, get, update, remove, and find.
- Access of documents and subdocuments seamless due to a keypath based design.

##Roadmap
- Advanced queries (implement all mongodb query operators)
- Joins
- Profile and optimize

##Documentation

* [open](#open)
* [create](#create)
* [put](#put)
* [get](#get)
* [remove](#remove)
* [find](#remove)
* [transaction](#transaction)
* [addIndex](#addindex)

##Example


```
// Open a foundationDB database
fowl.open();

// Create a document (if _id not specify a GUID will be generated)
var john = fowl.create('people', {
  _id: 'john',
  name: 'John',
  lastname: 'Smith',
  balance: 100
});

var lisa = fowl.create('people', {
  _id: 'lisa',
  name: 'Lisa',
  lastname: 'Jones',
  balance: 80
});

// Use transactions to transfer money from one account to another
var tr = fowl.transaction()

tr.get(['people', 'john', 'balance']).then(function(johnBalance){
  tr.put(['people', 'john', 'balance'], johnBalance - 10);
});

tr.get(['people', 'lisa', 'balance']).then(function(lisaBalance){
  tr.put(['people','lisa', 'balance'], lisaBalance + 10);
})

tr.commit().then(function(){
  // We need to wait for the commit to complete since we are finding the
  // same keypaths.
  
  fowl.find('people', {balance: 90}, ['lastname']).then(function(docs){
    // docs = [{lastname: 'Jones'}, {lastname: 'Smith'}]
  })
})
```

In order to accelerate queries you should use indexes on the most common
fields in a document. Just add indexes specifying a base key path and the
fields to index:

```
fowl.addIndex('people',  ['name', 'balance']);
```


## About atomicity

All CRUD functions are atomic. Meaning that updating or getting a document is
fully atomic and you either update or get a full document or nothing at all.

The transaction object provides this same CRUD operations as atomic operations
spawning multiple documents.


## About Key Paths

Key paths are used in fowl to represent the location of some document or 
subdocument. It is just an array of strings (or numbers) that maps to a 
key or key range inside FoundationDB.
Key paths are more flexible than bucket based collections, as used for example
in mongoDB, since it allows you to specify a document or subdocument in a 
generic way.

For example:

```
// Specify a document for some user in bucket 'people'
['people', '60abd640-2d98-11e3-a7d8-bd61eca52c5c']

// Specify a location of all the songs in a playlist
['playlist', '60af31a0-2d98-11e3-a7d8-bd61eca52c5c', 'songs']

```

All methods accepting a key path as parameter also accept a string that will just
be converted to an array:

```
'people' -> ['people']
```

## About  the _id property

As in MongoDB, we generate a unique *_id* property as a primary key for all the 
created documents.

This property can be overrided if required by providing it explicitly in the
document object.

It is also possible skip the use of the *_id* property by just using the put 
method directly and never calling create.

## Methods

<a name="open"/>
### open([clusterFile, dbName])

Opens a FoundationDB database. This function is just a wrapper on top of
fdb##open
You need to call this method before you can start using the rest of the API.

__Arguments__
 
```javascript
    clusterFile {String} Optional path to a cluster file.
    dbName {String} Optional database name.
```

---------------------------------------

<a name="create"/>
### create(keyPath, doc)

Creates a new document in the given key path. The document must be a plain
object without any circular dependencies.
Returns a promise that will resolve to the document *_id* property.

__Arguments__
 
```javascript
    keyPath {Array|String} Keypath with the target location for the document.
    doc {Object} A plain object representing the document to store.
    returns {Promise} A promise that resolves to the document _id property.
```

---------------------------------------

<a name="put"/>
### put(keyPath, doc)

Updates a document. Similar to *create* but will not generate any _id property
automatically.

__Arguments__
 
```javascript
    keyPath {Array|String} Keypath with the target location for the document.
    doc {Object} A plain object representing the document to store.
    returns {Promise} A promise that resolves after the document has been updated.
```

---------------------------------------

<a name="get"/>
### get(keyPath)

Retrieves the document at the given key path.

__Arguments__
 
```javascript
    keyPath {Array|String} Keypath with the target location for the document.
    returns {Promise} A promise that resolves with the retrieved document.
```

---------------------------------------

<a name="remove"/>
### remove(keyPath)

Removes the document/subdocument at the given key path.

__Arguments__
 
```javascript
  keyPath {Array|String} Keypath with the target location for the document to remove.
  returns {Promise} A promise that resolves after the removal.  
```

---------------------------------------

<a name="find"/>
### find(keyPath, filter, [fields])

Finds documents in the given keypath that meets certain criteria. 

__Arguments__
 
```javascript
  keyPath {Array|String} Keypath with the target location of the documents to find
  filter {Object} An object mapping properties to their values.
  fields {Array} An optiona array of property names that should be returned.
  returns {Promise} A promise that resolves with the found documents.
```

---------------------------------------


<a name="transaction"/>
### transaction()

Creates a new transaction. A transaction is an object that provides methods 
to access the database as an atomic operation.


---------------------------------------

<a name="open"/>
#### transaction##commit()

Commits this transaction by executing all the operations and resolving their 
promises. It returns a promise that is resolved when all operations have been
executed.

__Arguments__
 
```javascript
    returns {Promise} A promise resolved when the commit has been executed.
```

#### transaction##create()

A transactional equivalent to [fowl##create](#create)

#### transaction##put()

A transactional equivalent to [fowl##put](#put)

#### transaction##get()

A transactional equivalent to [fowl##get](#get)

#### transaction##remove()

A transactional equivalent to [fowl##remove](#remove)

#### transaction##find()

A transactional equivalent to [fowl##find](#find)

<a name="addIndex"/>
### addIndex(keyPath, fields)

Adds an index for the given key path and fields. After calling this method,
everytime the key paths with the given fields are updated, an index is also
updated so that queries on such fields can be performed much faster.

__Arguments__
 
```javascript
  keyPath {Array|String} base key path for the index.
  fields {String|Array} A field or array of fields to index.
  returns {Promise} A promise that resolves after the index has been added.
```

---------------------------------------

##License 

(The MIT License)

Copyright (c) 2011-2013 Manuel Astudillo <manuel@optimalbits.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.