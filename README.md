Exandria is a decentralized file sharing system that includes search.

Getting started
===============

First, clone this repo and run `npm install`.

If you want to see [debug](https://github.com/visionmedia/debug) logs, set the env var `DEBUG` to `*`.

How to read
-----------
From the project directory:

1. To list all files, run `node bin/print-files`. This will be very slow the first time.
2. Use `bin/get-file` to download a file. For example, `node bin/get-file 'Pride and Prejudice by Jane Austen.epub'`. The file will appear in the `files` directory.

How to write
------------
1. According to the [burn-stream-writer](https://github.com/paulkernfeld/burn-stream-writer docs), set up Bitcoin and make a `client-config.json` file.
2. Write your identity to the Bitcoin blockchain with `bin/write-identity`.
3. Add some files using `bin/append`.
4. Run `bin/serve` to share your local files with the world.

How does it work?
=================
See [this blog post](http://paulkernfeld.com/2016/04/13/exandria.html).
