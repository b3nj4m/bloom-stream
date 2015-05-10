var expect = require('chai').expect;
var Bloom = require('./index');
var Stream = require('stream');

function toString(num) {
  return num.toString();
}

function toBuffer(num) {
  var buf = new Buffer(4);
  buf.writeInt32LE(num);
  return buf;
}

function makeBloom(size, numHashes, seed, hashType, numElements, elementType, callback) {
  var b = new Bloom(size, numElements, seed, hashType);
  var rs = new Stream.Readable();
  var elementFn = elementType === 'strings' ? toString : toBuffer;
  var i = 0;

  rs._read = function() {
    var pushed = true;

    while (pushed && i < numElements) {
      pushed = this.push(elementFn(i++));
    }
    if (pushed) {
      return this.push(null);
    }
  };

  b.on('finish', callback.bind(this, b));

  rs.pipe(b);
}

function expectElements(b, startNum, endNum, elementType) {
  var elementFn = elementType === 'strings' ? toString : toBuffer;
  for (var i = startNum; i < endNum; i++) {
    expect(b.has(elementFn(i))).to.be.true;
  }
}

describe('bloom', function() {
  describe('false negatives', function() {
    it('should return no false negatives', function(done) {
      makeBloom(128, 3, 42, 'murmur', 10, 'buffers', function(b, elements) {
        expectElements(b, 10, 'buffers');
        done();
      });
    });
  });
});
