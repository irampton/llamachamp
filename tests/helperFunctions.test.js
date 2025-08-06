const test = require('node:test');
const assert = require('node:assert');
const axios = require('axios');

global.basePrompt = 'Base prompt';

const { sendOutput, askLLaMA, randomInt } = require('../helperFunctions');

// sendOutput tests

test('sendOutput sends a simple message', () => {
  const sent = [];
  sendOutput('hello world', m => sent.push(m));
  assert.deepStrictEqual(sent, ['hello world']);
});

test('sendOutput ignores blank messages', () => {
  const sent = [];
  sendOutput('   ', m => sent.push(m));
  assert.deepStrictEqual(sent, []);
});

test('sendOutput catches send errors', async () => {
  const errors = [];
  const orig = console.error;
  console.error = e => errors.push(e);
  await new Promise(resolve => {
    sendOutput('hi', () => Promise.reject({ code: 50013 }));
    setImmediate(resolve);
  });
  console.error = orig;
  assert.ok(errors.some(e => typeof e === 'string' && e.includes('Missing Permissions')));
});

// askLLaMA tests

test('askLLaMA posts string prompt and returns text', async () => {
  const orig = axios.post;
  let captured;
  axios.post = (url, data) => {
    captured = { url, data };
    return Promise.resolve({
      data: { choices: [ { message: { content: 'answer' } } ] }
    });
  };

  await new Promise(resolve => {
    askLLaMA({ prompt: 'Hi', tokens: 5 }, text => {
      assert.strictEqual(text, 'answer');
      resolve();
    });
  });

  assert.strictEqual(captured.url, 'http://llama.cpp:8000/v1/chat/completions');
  assert.strictEqual(captured.data.messages[1].content[0].text, 'Hi');
  axios.post = orig;
});


test('askLLaMA handles conversation prompts and crazy option', async () => {
  const orig = axios.post;
  let captured;
  axios.post = (url, data) => {
    captured = data;
    return Promise.resolve({
      data: { choices: [ { message: { content: [ { text: 'a' }, { text: 'b' } ] } } ] }
    });
  };

  const convo = [
    { isBot: false, sender: 'Alice', content: 'Hi', timestamp: 0 },
    { isBot: true, content: 'Hello' }
  ];

  await new Promise(resolve => {
    askLLaMA({ prompt: convo, tokens: 10, crazy: true }, text => {
      assert.strictEqual(text, 'ab');
      resolve();
    });
  });

  assert.strictEqual(captured.messages.length, 3);
  assert.strictEqual(captured.messages[1].role, 'user');
  assert.ok(captured.messages[1].content[0].text.includes('Hi'));
  assert.strictEqual(captured.messages[2].role, 'assistant');
  assert.strictEqual(captured.messages[2].content[0].text, 'Hello');
  assert.strictEqual(captured.top_k, 100);
  assert.strictEqual(captured.top_p, 0.20);
  axios.post = orig;
});

// randomInt tests

test('randomInt generates numbers within range', () => {
  const vals = new Set();
  for (let i = 0; i < 100; i++) {
    const v = randomInt(1, 4);
    assert.ok(v >= 1 && v < 4);
    vals.add(v);
  }
  assert.ok(vals.size > 1);
});

