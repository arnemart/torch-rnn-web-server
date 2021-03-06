const express = require('express');
const { exec } = require('child_process');
const { readFileSync } = require('fs');
const unique = require('array-unique');

// Uncomment to tweet
//const tw = require('./tweet.js');
//tw();

const app = express();

const template = readFileSync('template.html').toString();

app.get('/', function(req, res) {

  let temperature = 1;

  if (req.query.t && req.query.t.match(/^\d+(\.\d+)?$/)) {
    temperature = req.query.t;
  }

  // Fetch data
  generateData('/app/sample_checkpoints/harlequin_romance.t7', '2000', temperature, function(str) {

    // Split into lines, remove the first and last lines and any duplicates
    const parts = unique(str.split('\n').slice(1, -1))
        .filter(s => s.length > 1)     // Remove lines 1 character or less
        .slice(0, 10)                  // Take a maximum of 10 lines
        .map(s => '<p>' + s + '</p>'); // Wrap in paragraph tags

    const title = 'Title:';

    // Render template
    res.send(
      template
        .replace(/\{\{title\}\}/g, title)
        .replace('{{content}}', parts.join("\n"))
    );
  });
});

app.listen(80);


let when = {};
let cached = {};

function generateData(cp, l, t, cb) {
  const now = Date.now();
  const key = `${cp}${t}`;

  if (!when[key]) {
    when[key] = 0;
  }

  // Cache results for 10 seconds
  if (now - when[key] > 10000 || !cached[key]) {
    when[key] = now;
    try {
      exec(`cd /root/torch-rnn && th sample.lua -checkpoint ${cp} -length ${l} -gpu -1 -temperature ${t}`, function(err, str) {
        if (err) {
          console.error(err);
          cb('');
        } else {
          cached[key] = str;
          cb(cached[key]);
        }
      });
    } catch (e) {
      console.error(e);
      cb('');
    }
  } else {
    cb(cached[key]);
  }
}

function randomize(it) {
  return it.reduce(function(s, a) {
    if (typeof a == 'string') {
      s += a;
    } else {
      s += a[Math.floor(Math.random() * a.length)];
    }
    return s;
  }, '');
}
