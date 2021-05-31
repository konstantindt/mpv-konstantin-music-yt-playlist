# mpv-konstantin-music-yt-playlist

Proof of concept to play my music YouTube playlist using [mpv.io](https://mpv.io/) in a nice random order efficiently.

The script writes a shuffled [M3U](https://wikipedia.org/wiki/M3U) with my music playlist video links, build from the data obtained from [PlaylistItems | YouTube Data API](https://developers.google.com/youtube/v3/docs/playlistItems), and plays with [mpv.io](https://mpv.io/).

## Dependencies

* [mpv.io](https://mpv.io/)
* [youtube-dl](https://youtube-dl.org/)

## Usage

First [obtain a YouTube API key](https://www.slickremix.com/docs/get-api-key-for-youtube/) and replace `PLACEHOLDER` with it at `@root/config/index.config`.

Then:

```bash
$ # go to mpv-konstantin-music-yt-playlist
$ cd path/to/mpv-konstantin-music-yt-playlist
$ # avoid accidental commit of API key
$ git update-index --assume-unchanged config/index.config.js 
$ # set-up run from anywhere
$ npm install -g .
$ # run
$ mpv-konstantin-music-yt-playlist
```

## Background

* YouTube UI doesn't handle playing playlists that have hundreds of videos.
* Listening to music on YouTube in a modern browser like Google Chrome is wasteful - a CLI can do better.
* [youtube-viewer](https://github.com/trizen/youtube-viewer) has a neat YouTube CLI browser using [PlaylistItems | YouTube Data API](https://developers.google.com/youtube/v3/docs/playlistItems) however shuffling, while it works, it's not uniform because only within the pages of the playlist are items shuffled and the pages are always taken in the same order.
* In general basic computer shuffling is quite poor. [How We Learned to Cheat at Online Poker: A Study in Software Security](https://www.developer.com/guides/how-we-learned-to-cheat-at-online-poker-a-study-in-software-security/) is a case in point.

## Implementation

* Automatically tested CLI that simply builds video links from the data obtained from [PlaylistItems | YouTube Data API](https://developers.google.com/youtube/v3/docs/playlistItems),
* shuffles them using the famed [Mersenne Twister](https://wikipedia.org/wiki/Mersenne_Twister) random number generator,
* writes them in playlist format for [mpv.io](https://mpv.io/) ([M3U](https://wikipedia.org/wiki/M3U)) and
* plays the new playlist with [mpv.io](https://mpv.io/) without video.

## Future work

Better open source:

* move the YouTube client to a rust library (protect API key, ...) and
* then have a general purpose CLI for managing and exporting YouTube playlist (useful for replacing broken videos, ...).

## License

See the [LICENSE](LICENSE.md) file for license rights and limitations (MIT).
