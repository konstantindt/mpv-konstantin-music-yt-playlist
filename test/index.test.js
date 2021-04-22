require('module-alias/register');

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const nock = require('nock');
const mockFs = require('mock-fs');
const sinon = require('sinon');
const fs = require('fs');
const child_process = require('child_process');
const MersenneTwister = require('mersenne-twister');

const { apiKey } = require('@root/config/index.config');
const {
  playlistItemsPage1Fixture,
  playlistItemsPage2Fixture
} = require('@root/fixture/playlist-items.fixture');

// Here so alters the copy of execSync that the main has.
const spawn = sinon.stub(child_process, 'spawn').returns({ kill() {} });

const {
  youtubePlaylistItemsEndpoint,
  playlistId,
  playlistItemsPart,
  firstPageToken,
  youtubeShareUrlOrigin,
  playingM3uFilePath,
  fetchVideoUrls,
  shuffleVideoUrlsInPlace,
  writeVideoUrlsToPlayingM3uFile,
  mpvPlayPlayingM3uFile
} = require('@root/bin/index');

const expect = chai.expect;
chai.use(chaiAsPromised);

const MAX_RESULTS = 5;
const SECOND_PAGE_TOKEN = playlistItemsPage1Fixture.nextPageToken;

describe('mpv-konstantin-music-yt-playlist', () => {

  describe('bin', () => {

    describe('fetchVideoUrls', () => {

      it('should return the list of video URLs', async () => {
        const url = new URL(youtubePlaylistItemsEndpoint);
        url.searchParams.set('playlistId', playlistId);
        url.searchParams.set('part', playlistItemsPart);
        url.searchParams.set('pageToken', firstPageToken);
        url.searchParams.set('maxResults', MAX_RESULTS);

        const scope = nock(url.origin, {
          'reqheaders': {
            'X-Goog-Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
        })
          .get(url.pathname + url.search)
          .reply(200, playlistItemsPage1Fixture);

        url.searchParams.set('pageToken', SECOND_PAGE_TOKEN);
        scope.get(url.pathname + url.search)
          .reply(200, playlistItemsPage2Fixture);

        const expectedVideoUrls = [];
        const pushVideoUrl = (item) => expectedVideoUrls.push(`${youtubeShareUrlOrigin}/${item.contentDetails.videoId}`);
        playlistItemsPage1Fixture.items.forEach(pushVideoUrl);
        playlistItemsPage2Fixture.items.forEach(pushVideoUrl);

        const videoUrls = await fetchVideoUrls(MAX_RESULTS);

        expect(videoUrls).to.eql(expectedVideoUrls);
      });

      it('should throw an error for server error', async () => {
        const url = new URL(youtubePlaylistItemsEndpoint);
        url.searchParams.set('playlistId', playlistId);
        url.searchParams.set('part', playlistItemsPart);
        url.searchParams.set('pageToken', firstPageToken);
        url.searchParams.set('maxResults', MAX_RESULTS);

        const scope = nock(url.origin, {
          'reqheaders': {
            'X-Goog-Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
        })
          .get(url.pathname + url.search)
          // careful of retries
          .reply(500, 'Developer error');

          await expect(fetchVideoUrls(MAX_RESULTS)).to.be.rejectedWith(`Internal Server Error`);
      });

      it('should throw an error for client error', async () => {
        const url = new URL(youtubePlaylistItemsEndpoint);
        url.searchParams.set('playlistId', playlistId);
        url.searchParams.set('part', playlistItemsPart);
        url.searchParams.set('pageToken', firstPageToken);
        url.searchParams.set('maxResults', MAX_RESULTS);

        nock(url.origin, {
          'reqheaders': {
            'X-Goog-Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
        })
          .get(url.pathname + url.search)
          .reply(404);

          await expect(fetchVideoUrls(MAX_RESULTS)).to.be.rejectedWith(`Not Found`);
      });

    });

    describe('shuffleVideoUrlsInPlace', () => {

      const rng = new MersenneTwister();

      it('should change the order of the video URLs', async function() {
        // guard against same order after shuffle
        this.retries(3);

        const videoUrlsFixtureOrder = [];
        const pushVideoUrlFixtureOrder = (item) => {
          videoUrlsFixtureOrder.push(`${youtubeShareUrlOrigin}/${item.contentDetails.videoId}`);
        };
        playlistItemsPage1Fixture.items.forEach(pushVideoUrlFixtureOrder);
        playlistItemsPage2Fixture.items.forEach(pushVideoUrlFixtureOrder);

        const videoUrls = videoUrlsFixtureOrder.slice();

        await shuffleVideoUrlsInPlace(videoUrls, rng);

        expect(videoUrls).to.not.eql(videoUrlsFixtureOrder);
      });

    });

    describe('writeVideoUrlsToPlayingM3uFile', () => {

      it(`should write the ${playingM3uFilePath} file`, async () => {
        const videoUrls = [];
        const pushVideoUrl = (item) => videoUrls.push(`${youtubeShareUrlOrigin}/${item.contentDetails.videoId}`);
        playlistItemsPage1Fixture.items.forEach(pushVideoUrl);
        playlistItemsPage2Fixture.items.forEach(pushVideoUrl);

        mockFs();

        await writeVideoUrlsToPlayingM3uFile(videoUrls);

        const expectedFileContents = `${videoUrls.join('\n')}\n`;
        const actualFileContents = fs.readFileSync(playingM3uFilePath, "utf8");

        expect(actualFileContents).to.eq(expectedFileContents);

        mockFs.restore();
      });

    });

    describe('mpvPlayPlayingM3uFile', () => {

      it(`should start mpv with ${playingM3uFilePath} file`, async () => {
        await mpvPlayPlayingM3uFile();

        spawn.restore();

        expect(spawn.calledOnceWith('mpv', [`--playlist=${playingM3uFilePath}`, '--no-video'], {
          stdio: 'inherit'
        })).to.be.true;
      });

    });

  });

  describe('config', () => {

    describe('credentials', () => {

      it(`should have set the API key`, () => {
        expect(apiKey).to.not.eq('PLACEHOLDER');
      });

    });

  });

});
