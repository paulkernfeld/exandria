var _ = require('lodash')

var throttledDebug = function (debug, opts) {
  var lastString
  var lastNanos = 0

  opts = _.defaults(opts, {interval: 1000})

  return function () {
    var currentNanos = process.hrtime()[0] * 1000000000 + process.hrtime()[1]
    if (lastString !== arguments[0] || currentNanos >= lastNanos + opts.interval * 1000000) {
      lastString = arguments[0]
      lastNanos = currentNanos
      debug.apply(debug, arguments)
    }
  }
}

module.exports = throttledDebug
