const rss = require('../data/rss.json');
const shell = require('shelljs');
const wget = require('wget-improved');

// Make sure parent dir existence
shell.mkdir('-p', './static/feeds');

Object.keys(rss).forEach(function (key) {
  let src = rss[key];
  let dist = `./static/${key}.rss`;
  let download = wget.download(src, dist);
  download.on('error', function(err) {
    console.err(err);
  });
});