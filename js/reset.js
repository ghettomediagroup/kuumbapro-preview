/* The Joy Up 30 Second Joy Reset, as an interactive module.
 *
 * Design constraint from the source material: no per-step timings exist in
 * any document Dr. Hinton has written, and the ebook explicitly says
 * "There is no perfect way to do it. Participation matters more than
 * precision." So this is SELF-PACED. The ring counts the thirty seconds he
 * does name ("The entire Joy Up practice can take as little as 30 seconds"),
 * the user advances the steps by tapping. Nothing is invented.
 *
 * Ship-ready polish:
 *   - navigator.wakeLock keeps the screen awake during an active session
 *   - prefers-reduced-motion snaps transitions instead of animating
 *   - completion state offers navigator.share + copy-link fallback for
 *     the deep-linkable Joy Up URL, so the practice is spreadable
 *   - #begin URL fragment or ?autostart=1 launches straight into the reset
 */
(function () {
  var mod = document.getElementById('resetModule');
  if (!mod) return;

  var begin = document.getElementById('resetBegin');
  var stop  = document.getElementById('resetStop');
  var count = document.getElementById('resetCount');
  var prog  = document.getElementById('resetProg');
  var done  = document.getElementById('resetDone');
  var items = Array.prototype.slice.call(document.querySelectorAll('#resetSteps > li'));

  var TOTAL = 30;
  var CIRC = 2 * Math.PI * 95;
  var timer = null, left = TOTAL, idx = -1;
  var wakeLock = null;

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  prog.style.strokeDasharray = CIRC;

  function ring(fraction) {
    prog.style.strokeDashoffset = String(CIRC * (1 - fraction));
  }

  function label(n, word) {
    count.innerHTML = String(n) + '<small>' + word + '</small>';
  }

  function paint() {
    items.forEach(function (li, i) {
      var active = i === idx;
      li.classList.toggle('active', active);
      li.classList.toggle('done', i < idx);
      if (active) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    });
  }

  function scrollOptions() {
    return { block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' };
  }

  // Each step gets its own advance button, hidden until Begin is pressed.
  items.forEach(function (li, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-ghost btn-sm reset-next-btn';
    b.style.marginTop = '.8rem';
    b.style.minWidth = '96px';
    b.style.minHeight = '44px';
    b.textContent = i === items.length - 1 ? 'Done' : 'Next';
    b.hidden = true;
    b.addEventListener('click', function () {
      if (idx < 0) return;
      advance(i + 1);
    });
    li.querySelector('div').appendChild(b);
    li.dataset.hasBtn = '1';
  });

  function advance(next) {
    if (idx < 0) return;
    idx = next;
    if (idx >= items.length) return finish();
    paint();
    items[idx].scrollIntoView(scrollOptions());
    var nextBtn = items[idx].querySelector('button');
    if (nextBtn) try { nextBtn.focus({ preventScroll: true }); } catch (e) {}
  }

  function tick() {
    left -= 1;
    if (left <= 0) {
      left = 0;
      ring(1);
      clearInterval(timer); timer = null;
      finish();
      return;
    }
    ring((TOTAL - left) / TOTAL);
    label(left, left === 1 ? 'second' : 'seconds');
  }

  function requestWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
      navigator.wakeLock.request('screen').then(function (lock) {
        wakeLock = lock;
        lock.addEventListener && lock.addEventListener('release', function () { wakeLock = null; });
      }).catch(function () { /* denied — okay */ });
    } catch (e) { /* not supported */ }
  }

  function releaseWakeLock() {
    if (wakeLock && wakeLock.release) {
      try { wakeLock.release(); } catch (e) {}
    }
    wakeLock = null;
  }

  // If the tab becomes visible mid-session, re-acquire the wake lock.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && idx >= 0 && !wakeLock) {
      requestWakeLock();
    }
  });

  function start() {
    reset(true);
    begin.hidden = true;
    stop.hidden = false;
    done.hidden = true;
    items.forEach(function (li) { var b = li.querySelector('button'); if (b) b.hidden = false; });
    idx = 0; paint();
    requestWakeLock();
    timer = setInterval(tick, 1000);
    var firstBtn = items[0] && items[0].querySelector('button');
    if (firstBtn) try { firstBtn.focus({ preventScroll: true }); } catch (e) {}
  }

  function finish() {
    if (timer) { clearInterval(timer); timer = null; }
    releaseWakeLock();
    items.forEach(function (li) { li.classList.remove('active'); li.classList.add('done'); li.removeAttribute('aria-current'); });
    done.hidden = false;
    done.setAttribute('role', 'status');
    done.setAttribute('tabindex', '-1');
    label('✓', 'complete');
    ring(1);
    injectShareActions();
    done.scrollIntoView(scrollOptions());
    try { done.focus({ preventScroll: true }); } catch (e) {}
  }

  function reset(keepButtons) {
    if (timer) { clearInterval(timer); timer = null; }
    releaseWakeLock();
    left = TOTAL; idx = -1;
    ring(0);
    label(TOTAL, 'seconds');
    items.forEach(function (li) {
      li.classList.remove('active', 'done');
      li.removeAttribute('aria-current');
      var b = li.querySelector('button'); if (b) b.hidden = true;
    });
    done.hidden = true;
    if (!keepButtons) { begin.hidden = false; stop.hidden = true; }
  }

  // Share affordance at completion. Uses navigator.share when available
  // (iOS Safari, Android Chrome), falls back to copy-to-clipboard.
  function injectShareActions() {
    if (done.querySelector('.reset-share-actions')) return;
    var url = location.origin + (location.pathname.replace(/[^/]*$/, '') || '/') + 'practice.html#begin';
    var wrap = document.createElement('div');
    wrap.className = 'reset-share-actions';
    wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:.6rem;margin-top:1.25rem;justify-content:center';

    var again = document.createElement('button');
    again.type = 'button';
    again.className = 'btn btn-ghost btn-sm';
    again.textContent = 'Again';
    again.style.minHeight = '44px';
    again.addEventListener('click', function () { reset(false); begin.click(); });

    var shareBtn = document.createElement('button');
    shareBtn.type = 'button';
    shareBtn.className = 'btn btn-gold btn-sm';
    shareBtn.style.minHeight = '44px';
    shareBtn.textContent = navigator.share ? 'Share this reset' : 'Copy link';
    shareBtn.addEventListener('click', function () {
      var payload = {
        title: 'Joy Up 30 Second Joy Reset',
        text: 'Thirty seconds. Right now.',
        url: url,
      };
      if (navigator.share) {
        navigator.share(payload).catch(function () { copyFallback(shareBtn, url); });
      } else {
        copyFallback(shareBtn, url);
      }
    });

    wrap.appendChild(again);
    wrap.appendChild(shareBtn);
    done.appendChild(wrap);
  }

  function copyFallback(btn, url) {
    var orig = btn.textContent;
    var ok = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        btn.textContent = 'Link copied';
        setTimeout(function () { btn.textContent = orig; }, 2000);
      }).catch(function () {
        promptFallback(url);
      });
    } else {
      promptFallback(url);
    }
  }

  function promptFallback(url) {
    try { window.prompt('Copy the link', url); } catch (e) {}
  }

  begin.addEventListener('click', start);
  stop.addEventListener('click', function () { reset(false); });

  reset(false);

  // Deep-link: /#begin or ?autostart=1 kicks straight into the reset.
  function maybeAutostart() {
    var hash = (location.hash || '').toLowerCase();
    var qs = (location.search || '').toLowerCase();
    if (hash === '#begin' || hash === '#reset' || qs.indexOf('autostart=1') !== -1) {
      // Give layout a moment to settle, then start.
      setTimeout(function () {
        mod.scrollIntoView(scrollOptions());
        start();
      }, reducedMotion ? 0 : 200);
    }
  }
  maybeAutostart();
})();
