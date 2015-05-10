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
  this.registersSize = Math.ceil(this.size / REGISTER_BITS);
  this.numHashes = numHashes || 3;
  this.hashType = hashType || 'murmur';
  this.seed = seed || 42;
  this.registers = new Array(this.registersSize);
  this.hash = hashFns[this.hashType] || this.cryptoHash;
  this.hashes = new Array(this.numHashes);

  for (var i = 0; i < this.registers; i++) {
    this.registers[i] = 0;
  }

  for (i = 0; i < this.hashes.length; i++) {
    this.hashes[i] = this.hash.bind(this, this.seed + i);
  }
}

Bloom.prototype = Object.create(Stream.Writable.prototype);
Bloom.prototype.constructor = Bloom;

Bloom.prototype.cryptoHash = function(seed, key) {
  if (!Buffer.isBuffer(key)) {
    key = new Buffer(key);
  }
  key = Buffer.concat([new Buffer([seed]), key]);
  return Math.abs(crypto.createHash(this.hashType).update(key).digest().readInt32LE(0, 4)) % this.size;
};

Bloom.prototype.write = function(chunk, enc, next) {
  var hash;
  for (var i = 0; i < this.numHashes; i++) {
    hash = this.hashes[i](chunk);
    this.registers[Math.floor(hash / REGISTER_BITS)] |= 1 << (REGISTER_BITS - 1 - (hash % REGISTER_BITS));
  }

  if (next) {
    next();
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

module.exports = Bloom;
