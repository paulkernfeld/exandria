#!/usr/bin/env node

var assert = require('assert')
var fs = require('fs')

var argv = require('minimist')(process.argv.slice(2))
var Writer = require('burn-stream-writer')
var prompt = require('prompt')

var identities = require('../lib/identities')

assert(argv.t, 'You must pass in the -t argument')

var publicKey = identities.getKeypair().publicKey
console.log('key:', publicKey.toString('hex'))

var appConfig = JSON.parse(fs.readFileSync('app-config.json'))
var clientConfig = JSON.parse(fs.readFileSync('client-config.json'))

// Write
var writer = Writer(clientConfig, appConfig)

// TODO check address validity
assert(argv.address, 'You must pass in an address, --address')

var opts = argv
assert.equal(publicKey.length, 32)
opts.message = '00' + publicKey.toString('hex')

assert(argv.amount, 'You must specify an amount')

console.log('amount:', argv.amount)

writer.getUtxos(function (err, utxos) {
  assert.ifError(err)

  assert(utxos[0].address === argv.address, 'Need to implement utxo reordering')
  opts.utxos = utxos
  writer.createTx(opts, function (err, tx) {
    assert.ifError(err)

    console.log('send tx? y/n')
    prompt.get(['write'], function (err, result) {
      assert.ifError(err)

      if (result.write === 'y') {
        writer.send(tx.hex, function (err) {
          assert.ifError(err)
          console.log('write submitted successfully')
        })
      } else {
        console.log('not sending')
      }
    })
  })
})
