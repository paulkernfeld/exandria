Exandria is a decentralized file sharing system that includes search.

[![Build Status](https://travis-ci.org/paulkernfeld/exandria.svg)](https://travis-ci.org/paulkernfeld/exandria) [![Gitter](https://badges.gitter.im/paulkernfeld/exandria.svg)](https://gitter.im/paulkernfeld/exandria) [![npm](https://img.shields.io/npm/dt/exandria.svg)](https://www.npmjs.com/package/exandria)

Overview
========
Exandria allows you to search for files and download them. To do this, you don't need an invite or account.

Exandria is not only physically decentralized; the process for determining what goes into the search index is also completely decentralized. No one person has the ability to turn the system off. This is an innovation compared with previous systems.

To write files to the Exandria database, you need to burn bitcoins. This makes spamming prohibitively expensive.

Getting started
===============
This is a Node.js repo. Clone this repo and run `npm install`.

If you want to see [debug](https://github.com/visionmedia/debug) logs, set the env var `DEBUG` to `exandria`.

Since exandria uses peer-to-peer connections, you may need to ensure that your machine can accept incoming connections. This might involve changing your firewall, router, VPN, or other network configuration.

How to read
-----------
1. To list all files, run `node bin/print-archives`. This will be very slow the first time.
2. Use `bin/sync-archive` to download an archive. For example, `node bin/sync-archive README.md`. The archive will appear in the `archives` directory.

There are many other scripts in the `bin/` directory.

How to write
------------
1. According to the [burn-stream-writer docs](https://github.com/paulkernfeld/burn-stream-writer), set up Bitcoin and make a `client-config.json` file.
2. Write your identity to the Bitcoin blockchain with `bin/write-identity`.
3. Add a new archive using `bin/append`.
4. Run `bin/serve` to share your local files with the world.

Running Exandria locally
------------------------
For local development:

* Run a local signalhub on port 24144
* Run a local bitcoind or Bitcoin-Qt

Design
======
The core of Exandria is the index. This is a collection of file metadata, including names and content hashes. A client can do a text search through the index, and can retrieve any file listed in the index.

Identities
----------
An Exandria identity is a cryptographic key pair. The public key of each identity is stored on the Bitcoin blockchain. To register an identity, a user must burn bitcoins.

Exandria uses webcoin, an SPV client. This means that every Exandria client needs to download all blockchain headers (not all blocks!). See [burn-stream](https://github.com/paulkernfeld/burn-stream) for more on how this is implemented.

Currently, Exandria uses the Bitcoin testnet.

Feeds
-----
Each identity has an append-only [hypercore](https://github.com/mafintosh/hypercore) feed. Only the identity can publish to this feed (as enforced by its public key).

This feed can contain the following types of message:

* `AddArchive`: publishes a named hyperdrive archive
* ...more messages coming soon!

Every Exandria client downloads and replicates every feed. Each feed has its own independent swarm.

The Index
---------
The index is the union of all feeds.

Archives
--------
Exandria uses [hyperdrive](https://github.com/mafintosh/hyperdrive) archives to exchange files. An archive can have any number of files.

Each Exandria client only downloads the archives that the user tells it to.

Road Map
========
* Better command line interface
* Make it easier to get an identity
* Graphical user interface (probably Electron)
* Run in the browser!
* Web of trust model
* Anonymity (perhaps Tor?)
* Scalability improvements

More
====
See [this blog post](http://paulkernfeld.com/2016/04/13/exandria.html).
