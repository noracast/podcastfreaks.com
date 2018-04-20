const rss = require('../data/rss.json');
const shell = require('shelljs');
const wget = require('wget-improved');

const DIST_DIR = './static/rss';

// Make sure parent dir existence and its clean
shell.rm('-rf', DIST_DIR)
shell.mkdir('-p', DIST_DIR);

Object.keys(rss).forEach(function (key) {
  let src = rss[key];
  let dist = `${DIST_DIR}/${key}.rss`;
  let download = wget.download(src, dist);
  download.on('error', function(err) {
    console.err(err);
  });
});