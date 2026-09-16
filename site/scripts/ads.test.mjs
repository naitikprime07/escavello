import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const script = readFileSync(new URL('../assets/scripts/ads.js', import.meta.url), 'utf8');

function initialize(expected, interstitialSupported = true, providerAvailable = true) {
  const loaded = [], defined = [], displayed = [], order = [];
  const service = { enableSingleRequest() { order.push('singleRequest'); } };
  const interstitial = { addService(value) { assert.equal(value, service); return this; } };
  const googletag = {
    cmd: [],
    enums: { OutOfPageFormat: { INTERSTITIAL: 'interstitial' } },
    pubads: () => service,
    defineOutOfPageSlot(unit, format) {
      assert.equal(unit, '/23195226677,23305710766/escavello.com_tecentech_interstitial');
      assert.equal(format, 'interstitial');
      return interstitialSupported ? interstitial : null;
    },
    defineSlot(unit, size, id) {
      defined.push({ unit, size: Array.from(size), id });
      order.push('define');
      return { addService(value) { assert.equal(value, service); return this; } };
    },
    enableServices() { order.push('enable'); },
    display(slot) { assert.ok(slot); displayed.push(slot); order.push('display'); },
  };
  const context = {
    window: { googletag },
    document: {
      getElementById: (id) => expected.some((slot) => slot.id === id) ? {} : null,
      createElement: () => ({}),
      head: { append: (element) => loaded.push(element) },
    },
  };
  vm.runInNewContext(script, context);
  if (providerAvailable) googletag.cmd.forEach((callback) => callback());
  return { loaded, defined, displayed, order, queued: googletag.cmd.length };
}

test('script loads provider when ad containers exist', () => {
  const expected = [
    { unit: '/23195226677,23305710766/escavello.com_tecentech_320x250_new', size: [320, 250], id: 'gpt-passback' }
  ];
  const actual = initialize(expected, true);
  assert.equal(actual.loaded.length, 1);
  assert.equal(actual.loaded[0].src, 'https://securepubads.g.doubleclick.net/tag/js/gpt.js');
  assert.equal(actual.defined.length, 1);
  assert.ok(actual.order.indexOf('enable') < actual.order.indexOf('display'));
});

test('a blocked provider leaves queued commands and existing placeholders intact', () => {
  const expected = [
    { unit: '/23195226677,23305710766/escavello.com_tecentech_320x250_new', size: [320, 250], id: 'gpt-passback' }
  ];
  const actual = initialize(expected, true, false);
  assert.equal(actual.queued, 1);
  assert.equal(actual.defined.length, 0);
  assert.equal(actual.displayed.length, 0);
});

test('pages without ad containers do not load the provider', () => {
  const actual = initialize([]);
  assert.equal(actual.loaded.length, 0);
  assert.equal(actual.queued, 0);
});
