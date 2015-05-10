## bloom-stream

Pipe in your stream of buffers/strings to get approximate set membership (using Bloom filter).

```javascript
var Bloom = require('bloom-stream');

var bloom = new Bloom(128, 3);

//...

myDataSource.pipe(bloom);

bloom.on('finish', function() {
  console.log(bloom.has('42'));
  console.log(bloom.has('13'));
});
```

### API

#### Bloom(size, numHashes, seed, hashType, streamOpts)

Construct a new writable Bloom (extends [`Stream.Writable`](https://nodejs.org/api/stream.html#stream_class_stream_writable)).

* `size` - number of bits in the bloom filter table (default `128`).
* `numHashes` - number of bits to set for each element added (default `3`).
* `seed` - seed integer to seed hash functions with (default `42`).
* `hashType` - which hashing algorithm to use on the values. Can be `'murmur'` or any algorithm supported by [`crypto.createHash`](https://nodejs.org/api/crypto.html#crypto_crypto_createhash_algorithm) (default: `'murmur'`).
* `streamOpts` - the options to pass along to the stream constructor.
 
#### Bloom.has(element)

Test for membership of `element`.

#### Bloom.merge(bloom)

Merge another Bloom with this one. The two Blooms must have the same `size`, `numHashes`, `seed`, and `hashType`. Returns a new Bloom.

* `bloom` - another instance of `bloom-stream` to merge with this one.

#### Bloom.export()

Export the Bloom's data. Returns an object like:

```javascript
{
  size: 128,
  numHashes: 3,
  seed: 42,
  hashType: 'murmur',
  registers: [...]
}
```

#### Bloom.import(data)

Import Bloom data (as exported by `export()`). Replaces any pre-existing data.

* `data` - the data object to import. Should be in the same format as exported by `export()`.

