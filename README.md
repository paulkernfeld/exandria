Exandria is a decentralized file sharing system that includes search.

[![Build Status](https://travis-ci.org/paulkernfeld/exandria.svg)](https://travis-ci.org/paulkernfeld/exandria) [![Gitter](https://badges.gitter.im/paulkernfeld/exandria.svg)](https://gitter.im/paulkernfeld/exandria) [![npm](https://img.shields.io/npm/dt/exandria.svg)](https://www.npmjs.com/package/exandria)

Overview
========
Exandria allows you to search for files and download them. To do this, you don't need an invite or an account; just run the program!

Exandria is physically and logically decentralized. It is resistant to censorship as well as spam.

To write files to the Exandria database, you need to burn some bitcoins.

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

Design
======
At its core, Exandria has a searchable set of named file archives. The set can be searched, and the archives can be downloaded.

Identities
----------
An exandria identity is a cryptographic key pair. The public key of each identity is stored on the Bitcoin blockchain. To register an identity, a user must burn bitcoins.

Every Exandria node needs to download all blockchain headers.

Feeds
-----
Each identity has an append-only [hypercore](https://github.com/mafintosh/hypercore) feed. This feed can contain the following types of message:

* `AddArchive`: publishes a named hyperdrive archive
* ...more messages coming soon!

Every Exandria node downloads and replicates every feed. Taken together, the data in all users' feeds forms the search index.

Archives
--------
Exandria uses [hyperdrive](https://github.com/mafintosh/hyperdrive) archives to exchange files. Each archive can consist of one or more files.

Each Exandria node only downloads the archives that it wants to download.

More
====
See [this blog post](http://paulkernfeld.com/2016/04/13/exandria.html).
