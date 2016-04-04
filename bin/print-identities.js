#!/usr/bin/env node

var argv = require('minimist')(process.argv.slice(2))

var NestLevels = require('../lib/nest-levels')
var identities = require('../lib/identities')
var utils = require('../lib/utils')

var nest = NestLevels(utils.getDbPath(argv.db))
var identityStream = identities.IdentityStream(nest)
identityStream.stream.on('data', function (data) {
  console.log('key:', data.key.toString('hex'))
  console.log('satoshis:', data.burnStream.burnieTx.satoshis, '\n')
})
identityStream.start()
