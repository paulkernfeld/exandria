var debug = require('debug')('discovery-swarm')

var discoverySwarmDebug = function (swarm) {
  swarm.on('connection', function (peer, peerInfo) {
    debug('connection', peerInfo)
    peer.on('data', function (data) {
      debug('received from', peerInfo.id.toString('hex'), data.toString('hex'))
    })
  })
  swarm.on('peer', function (peer) {
    debug('candidate peer', peer)
  })
  swarm.on('connecting', function (peer) {
    debug('connecting', peer)
  })
  swarm.on('drop', function (peer) {
    debug('dropped peer', peer)
  })
  swarm.on('error', function (err) {
    debug('error', err)
  })
  swarm.on('listening', function () {
    debug('listening')
  })
  swarm.on('close', function () {
    debug('close')
  })
}

module.exports = discoverySwarmDebug
