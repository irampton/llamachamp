const test = require('node:test');
const assert = require('node:assert');

const { sendOutput } = require('../helperFunctions');
const { handleMessage, client } = require('../app');
const { SETTINGS } = require('../settings');

test('sendOutput splits long messages', () => {
  const outputs = [];
  sendOutput('a'.repeat(4000), msg => outputs.push(msg));
  assert(outputs.length > 1);
  assert.strictEqual(outputs.join('').length, 4000);
  outputs.forEach(o => assert(o.length <= 2000));
});

test('sendOutput only returns final chunk after markers', () => {
  const outputs = [];
  const input = '<|channel|>analysis<|message|>blah<|start|>assistant<|channel|>final<|message|>hello"';
  sendOutput(input, msg => outputs.push(msg));
  assert.deepStrictEqual(outputs, ['hello']);
});

test('handleMessage ignores messages from bots', () => {
  const msg = { author: { bot: true } };
  const result = handleMessage(msg);
  assert.strictEqual(result, false);
});

test('handleMessage can change personality', () => {
  const reactions = [];
  const msg = {
    author: { bot: false },
    content: '?llamaPersonality sigma',
    react: emoji => reactions.push(emoji)
  };
  handleMessage(msg);
  assert.strictEqual(SETTINGS.personality, 'sigma');
  assert.deepStrictEqual(reactions, ['👍']);
});

test('handleMessage responds to ?llamaOptions list', () => {
  const replies = [];
  client.user = { id: '1' };
  const msg = {
    author: { bot: false },
    guild: {},
    content: '?llamaOptions list',
    react: () => {},
    reply: text => { replies.push(text); return { catch: () => {} }; }
  };
  handleMessage(msg);
  assert.strictEqual(replies.length, 1);
  const obj = JSON.parse(replies[0]);
  assert.ok(Object.prototype.hasOwnProperty.call(obj, 'defaultTokens'));
});

test('handleMessage keeps typing when mentioned', () => {
  const axios = require('axios');
  const origPost = axios.post;
  axios.post = () => new Promise(() => {});

  client.user = { id: '123' };
  let typed = 0;
  const intervals = [];
  const origSetInterval = global.setInterval;
  global.setInterval = fn => { intervals.push(fn); return 1; };

  const msg = {
    author: { bot: false, displayName: 'User' },
    guild: {},
    content: '<@123> hi',
    mentions: { has: () => true, everyone: false },
    channel: {
      sendTyping: () => { typed++; return Promise.resolve(); },
      send: () => {},
      messages: { fetch: () => Promise.resolve({ filter: () => ({ sort: () => ({ forEach: () => {} }) }) }) }
    }
  };

  handleMessage(msg);
  assert.strictEqual(typed, 1);
  intervals.forEach(fn => fn());
  assert.ok(typed > 1);

  global.setInterval = origSetInterval;
  axios.post = origPost;
});

test('handleMessage keeps typing when randomly replying', () => {
  const axios = require('axios');
  const origPost = axios.post;
  axios.post = () => new Promise(() => {});

  client.user = { id: '123' };
  SETTINGS.randomResponseOn = true;
  SETTINGS.qResponseRate = 1;
  const origRand = Math.random;
  Math.random = () => 0;

  let typed = 0;
  const intervals = [];
  const origSetInterval = global.setInterval;
  global.setInterval = fn => { intervals.push(fn); return 1; };

  const msg = {
    author: { bot: false, displayName: 'User' },
    guild: {},
    content: 'hello?',
    mentions: { has: () => false, everyone: false },
    channel: {
      sendTyping: () => { typed++; return Promise.resolve(); },
      send: () => {},
      messages: { fetch: () => Promise.resolve({ filter: () => ({ sort: () => ({ forEach: () => {} }) }) }) }
    }
  };

  handleMessage(msg);
  assert.strictEqual(typed, 1);
  intervals.forEach(fn => fn());
  assert.ok(typed > 1);

  global.setInterval = origSetInterval;
  Math.random = origRand;
  SETTINGS.randomResponseOn = false;
  axios.post = origPost;
});

test('handleMessage ignores sendTyping errors', () => {
  const axios = require('axios');
  const origPost = axios.post;
  axios.post = () => new Promise(() => {});

  client.user = { id: '123' };
  let typed = 0;
  const intervals = [];
  const origSetInterval = global.setInterval;
  global.setInterval = fn => { intervals.push(fn); return 1; };

  const msg = {
    author: { bot: false, displayName: 'User' },
    guild: {},
    content: '<@123> hi',
    mentions: { has: () => true, everyone: false },
    channel: {
      sendTyping: () => { typed++; return Promise.reject(new Error('Missing Access')); },
      send: () => {},
      messages: { fetch: () => Promise.resolve({ filter: () => ({ sort: () => ({ forEach: () => {} }) }) }) }
    }
  };

  assert.doesNotThrow(() => handleMessage(msg));
  assert.strictEqual(typed, 1);
  intervals.forEach(fn => fn());
  assert.strictEqual(typed, 2);

  global.setInterval = origSetInterval;
  axios.post = origPost;
});
