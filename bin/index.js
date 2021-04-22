#!/usr/bin/env node

require('module-alias/register');

const request = require('superagent');
const MersenneTwister = require('mersenne-twister');
const shuffle = require('shuffle-array');
const fs = require('fs');
const { spawn } = require('child_process');
const yargs = require("yargs");

const { apiKey } = require('@root/config/index.config');

const YOUTUBE_PLAYLIST_ITEMS_ENDPOINT = 'https://www.googleapis.com/youtube/v3/playlistItems';
const PLAYLIST_ID = 'PL5YtzpdowHk_j3dlkSpHqNaMtB5WjJZky';
const PLAYLIST_ITEMS_PART = 'contentDetails';
const MAX_RESULTS = 50;
const FIRST_PAGE_TOKEN = '';
const YOUTUBE_SHARE_URL_ORIGIN = 'https://youtu.be';
const PLAYING_M3U_FILE_PATH = 'playing.m3u';

async function fetchVideoUrls(maxResults) {
  let pageToken = FIRST_PAGE_TOKEN;

  const url = new URL(YOUTUBE_PLAYLIST_ITEMS_ENDPOINT);
  url.searchParams.set('playlistId', PLAYLIST_ID);
  url.searchParams.set('part', PLAYLIST_ITEMS_PART);
  url.searchParams.set('maxResults', maxResults);

  const videoUrls = [];

  while (typeof pageToken === 'string') {
    url.searchParams.set('pageToken', pageToken);

    const response = await request.get(url)
      .set('X-Goog-Api-Key', apiKey)
      .set('Content-Type', 'application/json');

    const data = response.body;

    data.items.forEach((item) => videoUrls.push(`${YOUTUBE_SHARE_URL_ORIGIN}/${item.contentDetails.videoId}`));

    pageToken = data.nextPageToken;
  }

  return videoUrls;
}

async function shuffleVideoUrlsInPlace(videoUrls, rng) {
  shuffle(videoUrls, {
    rng() {
      return rng.random();
    }
  });
}

async function writeVideoUrlsToPlayingM3uFile(videoUrls) {
  fs.writeFileSync(PLAYING_M3U_FILE_PATH, `${videoUrls.join('\n')}\n`);
}

const mpvs = [];

process.on('SIGINT', function() {
  if (mpvs.length > 0) {
    mpvs.forEach((child) => child.kill());
    mpvs.length = 0;
  }
});

async function mpvPlayPlayingM3uFile() {
  const mpv = spawn('mpv', [`--playlist=${PLAYING_M3U_FILE_PATH}`, '--no-video'], {
    stdio: 'inherit'
  });
  mpvs.push(mpv);
}

async function main() {
  const videoUrls = await fetchVideoUrls(MAX_RESULTS);

  const rng = new MersenneTwister();

  await shuffleVideoUrlsInPlace(videoUrls, rng);

  await writeVideoUrlsToPlayingM3uFile(videoUrls);

  console.log(`Built uniformly shuffled ${PLAYING_M3U_FILE_PATH} from ${videoUrls.length} YouTube videos.`);
  console.log(`mpv --playlist=${PLAYING_M3U_FILE_PATH} --no-video`);

  await mpvPlayPlayingM3uFile();

  process.exitCode = 0;
}

module.exports = {
  fetchVideoUrls,
  shuffleVideoUrlsInPlace,
  writeVideoUrlsToPlayingM3uFile,
  mpvPlayPlayingM3uFile,
  youtubePlaylistItemsEndpoint: YOUTUBE_PLAYLIST_ITEMS_ENDPOINT,
  playlistId: PLAYLIST_ID,
  playlistItemsPart: PLAYLIST_ITEMS_PART,
  firstPageToken: FIRST_PAGE_TOKEN,
  youtubeShareUrlOrigin: YOUTUBE_SHARE_URL_ORIGIN,
  playingM3uFilePath: PLAYING_M3U_FILE_PATH
};

yargs.scriptName('mpv-konstantin-music-yt-playlist')
  .usage('Play using mpv.io my YouTube playlist in random order (creates playing.m3u).\n\nUsage: $0')
  .epilogue('Copyright (c) 2021 Konstantin Terziev')
  .argv;

main();
