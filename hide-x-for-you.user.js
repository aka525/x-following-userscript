// ==UserScript==
// @name         X おすすめ・広告非表示
// @namespace    local.codex.hide-x-for-you
// @version      1.1.0
// @description  Xの「おすすめ」とタイムライン広告を隠し、ホームでは「フォロー中」を表示します。
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-start
// @inject-into  content
// @grant        none
// @noframes
// ==/UserScript==

(() => {
  'use strict';

  const FOR_YOU_LABELS = new Set(['おすすめ', 'For you']);
  const FOLLOWING_LABELS = new Set(['フォロー中', 'Following']);
  const CLICK_COOLDOWN_MS = 1500;

  let lastClickAt = 0;
  let updateScheduled = false;

  const normalizedText = (element) =>
    element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

  const findTimelineTabs = () => {
    const tabs = [...document.querySelectorAll('[role="tab"]')];

    return {
      forYou: tabs.find((tab) => FOR_YOU_LABELS.has(normalizedText(tab))),
      following: tabs.find((tab) => FOLLOWING_LABELS.has(normalizedText(tab)))
    };
  };

  const hideTab = (tab, otherTab) => {
    if (!tab) return;

    const presentation = tab.closest('[role="presentation"]');
    const target = presentation && !presentation.contains(otherTab)
      ? presentation
      : tab;

    target.style.setProperty('display', 'none', 'important');
    target.dataset.hideXForYou = 'true';
  };

  const hideTimelineAds = () => {
    document
      .querySelectorAll('[data-testid="placementTracking"]')
      .forEach((placement) => {
        const promotedPost = placement.querySelector(
          'article[data-testid="tweet"]'
        );

        if (!promotedPost) return;

        const target =
          placement.closest('[data-testid="cellInnerDiv"]') || placement;

        target.style.setProperty('display', 'none', 'important');
        target.dataset.hideXAd = 'true';
      });
  };

  const updateTimeline = () => {
    updateScheduled = false;

    hideTimelineAds();

    if (!/^\/home\/?$/.test(location.pathname)) return;

    const { forYou, following } = findTimelineTabs();
    if (!forYou || !following) return;

    const forYouIsSelected = forYou.getAttribute('aria-selected') === 'true';

    if (forYouIsSelected && Date.now() - lastClickAt >= CLICK_COOLDOWN_MS) {
      lastClickAt = Date.now();
      following.click();
    }

    hideTab(forYou, following);
  };

  const scheduleUpdate = () => {
    if (updateScheduled) return;
    updateScheduled = true;
    requestAnimationFrame(updateTimeline);
  };

  const start = () => {
    const observer = new MutationObserver(scheduleUpdate);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-selected']
    });

    scheduleUpdate();
    window.addEventListener('pageshow', scheduleUpdate);
    window.addEventListener('popstate', scheduleUpdate);
  };

  if (document.documentElement) {
    start();
  } else {
    document.addEventListener('readystatechange', start, { once: true });
  }
})();
