var Stream = require('stream');
var crypto = require('crypto');
var murmur = require('murmur-hash-js');

var hashFns = {
  murmur: function(seed, key) {
    return murmur.murmur3(key, seed) % this.size;
  }
};

var REGISTER_BITS = 32;

function Bloom(size, numHashes, seed, hashType, streamOpts) {
  Stream.Writable.call(this, streamOpts);

  this.size = size || 128;
  this.numHashes = numHashes || 3;
  this.hashType = hashType || 'murmur';
  this.seed = seed || 42;

  this.computeConstants();
  this.setHashes();

  this.registers = new Array(this.registersSize);

  for (var i = 0; i < this.registers; i++) {
    this.registers[i] = 0;
  }
}

Bloom.prototype = Object.create(Stream.Writable.prototype);
Bloom.prototype.constructor = Bloom;

var log2squared = Math.pow(Math.log(2), 2);

Bloom.forCapacity = function(capacity, errorRate, seed, hashType, streamOpts) {
  errorRate = errorRate || 0.1;
  var numHashes = Math.ceil(Math.log2(1/errorRate));
  var size = Math.ceil(capacity * Math.abs(Math.log(errorRate)) / (numHashes * log2squared)) * numHashes;
  return new Bloom(size, numHashes, seed, hashType, streamOpts);
};

Bloom.prototype.computeConstants = function() {
  this.registersSize = Math.ceil(this.size / REGISTER_BITS);
  this.nextCounter = 0;
  this.nextLimit = 1000;
};

Bloom.prototype.setHashes = function() {
  this.hash = hashFns[this.hashType] || this.cryptoHash;
  this.hashes = new Array(this.numHashes);

  for (i = 0; i < this.hashes.length; i++) {
    this.hashes[i] = this.hash.bind(this, this.seed + i);
  }
};

Bloom.prototype.cryptoHash = function(seed, key) {
  if (!Buffer.isBuffer(key)) {
    key = new Buffer(key);
  }
  key = Buffer.concat([new Buffer([seed]), key]);
  return Math.abs(crypto.createHash(this.hashType).update(key).digest().readInt32LE(0, 4)) % this.size;
};

Bloom.prototype._write = function(chunk, enc, next) {
  var hash;
  for (var i = 0; i < this.numHashes; i++) {
    hash = this.hashes[i](chunk);
    this.registers[Math.floor(hash / REGISTER_BITS)] |= 1 << (REGISTER_BITS - 1 - (hash % REGISTER_BITS));
  }

  if (next) {
    this.nextCounter = (this.nextCounter + 1) % this.nextLimit;
    if (this.nextCounter === 0) {
      setTimeout(next, 0);
    }
    else {
      next();
    }
  }

  return true;
};

Bloom.prototype.has = function(key) {
  var hash;
  for (var i = 0; i < this.numHashes; i++) {
    hash = this.hashes[i](key);
    if ((this.registers[Math.floor(hash / REGISTER_BITS)] & 1 << (REGISTER_BITS - 1 - (hash % REGISTER_BITS))) === 0) {
      return false;
    }
  }
  return true;
};

Bloom.prototype.merge = function(bloom) {
  if (bloom.size !== this.size) {
    throw Error('Sizes of the blooms must match');
  }
  if (bloom.numHashes !== this.numHashes) {
    throw Error('NumHashes of the blooms must match');
  }
  if (bloom.seed !== this.seed) {
    throw Error('Seeds of the blooms must match');
  }
  if (bloom.hashType !== this.hashType) {
    throw Error('HashTypes of the blooms must match');
  }

  var result = new Bloom(this.size, this.numHashes, this.seed, this.hashType, this.streamOpts);

  for (var i = 0; i < this.registers.length; i++) {
    result.registers[i] = this.registers[i] | bloom.registers[i];
  }

  return result;
};

Bloom.prototype.export = function() {
  return {
    size: this.size,
    numHashes: this.numHashes,
    seed: this.seed,
    hashType: this.hashType,
    registers: this.registers.slice()
  };
};

Bloom.prototype.import = function(data) {
  this.size = data.size;
  this.numHashes = data.numHashes;
  this.seed = data.seed;
  this.hashType = data.hashType;
  this.registers = data.registers.slice();
  this.computeConstants();
  this.setHashes();
};

module.exports = Bloom;
