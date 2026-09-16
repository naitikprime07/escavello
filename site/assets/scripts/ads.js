// Google Publisher Tag ad slot configuration.
const network = '/23195226677,23305710766/';
const isHome = Boolean(document.getElementById('gpt-passback_1'));
const slots = [
  ['gpt-passback', 'escavello.com_tecentech_320x250_new', [320, 250]],
  ['gpt-passback2', isHome ? 'escavello.com_tecentech_320x50_new' : 'escavello.com_tecentech_320x50_1_new', [320, 50]],
  ...Array.from({ length: 5 }, (_, index) => [
    `gpt-passback_${index + 1}`, `escavello.com_tt_320x250_${index + 1}`, [320, 250],
  ]),
].filter(([id]) => document.getElementById(id));

if (slots.length) {
  window.googletag = window.googletag || { cmd: [] };
  window.googletag.cmd.push(() => {
    const googletag = window.googletag;
    const service = googletag.pubads();
    const interstitial = googletag.defineOutOfPageSlot(
      `${network}escavello.com_tecentech_interstitial`,
      googletag.enums.OutOfPageFormat.INTERSTITIAL,
    );
    if (interstitial) interstitial.addService(service);

    const defined = [];
    for (const [id, unit, size] of slots) {
      const slot = googletag.defineSlot(`${network}${unit}`, size, id);
      if (slot) {
        slot.addService(service);
        defined.push(id);
      }
    }
    service.enableSingleRequest();
    googletag.enableServices();
    if (interstitial) googletag.display(interstitial);
    for (const id of defined) googletag.display(id);
  });

  // Google manages its runtime, tracking frames, and delivery configuration.
  const loader = document.createElement('script');
  loader.async = true;
  loader.crossOrigin = 'anonymous';
  loader.src = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';
  document.head.append(loader);
}
