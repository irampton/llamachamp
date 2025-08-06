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
