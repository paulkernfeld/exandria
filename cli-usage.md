Usage
=====

Top-level commands:

* sync

sync
----
Example: exandria.js sync --identities none --feeds local --archives 0123456789abcdef01234567890abcdef --exit

Options:
* --identities: which identities to sync. Values:
    * none
    * local: use only identities that are already cached locally
    * live (default): sync identities from the live blockchain
* --feeds: which feeds to sync. Values (default: live):
    * none
    * [hex feed id]: sync only this feed
    * local: sync all feeds that have already been seen
    * live (default): sync all local feeds, plus feeds for new identities
*  --archives: which archives to sync. Values (default: local):
    * none
    * [hex archive id]: sync only this archive
    * local: sync all archives that have already been seen
    * live (default): sync all archives from all live feeds
* --exit: exit when the sync is complete