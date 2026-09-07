/* The Joy Up 30 Second Joy Reset, as an interactive module.
 *
 * Design constraint from the source material: no per-step timings exist in
 * any document Dr. Hinton has written, and the ebook explicitly says
 * "There is no perfect way to do it. Participation matters more than
 * precision." So this is SELF-PACED. The ring counts the thirty seconds he
 * does name ("The entire Joy Up practice can take as little as 30 seconds"),
 * the user advances the steps by tapping. Nothing is invented.
 */
(function () {
  var mod = document.getElementById('resetModule');
  if (!mod) return;

  var begin = document.getElementById('resetBegin');
  var stop  = document.getElementById('resetStop');
  var count = document.getElementById('resetCount');
  var prog  = document.getElementById('resetProg');
  var done  = document.getElementById('resetDone');
  // Direct children only. Step 1 contains a nested <ul> of adaptations, and a
  // bare "#resetSteps li" would pick those up too.
  var items = Array.prototype.slice.call(document.querySelectorAll('#resetSteps > li'));

  var TOTAL = 30;
  var CIRC = 2 * Math.PI * 95;   // r=95 in the SVG
  var timer = null, left = TOTAL, idx = -1;

  prog.style.strokeDasharray = CIRC;

  function ring(fraction) {
    prog.style.strokeDashoffset = String(CIRC * (1 - fraction));
  }

  function label(n, word) {
    count.innerHTML = n + '<small>' + word + '</small>';
  }

  function paint() {
    items.forEach(function (li, i) {
      li.classList.toggle('active', i === idx);
      li.classList.toggle('done', i < idx);
    });
  }

  // Give each step its own "I did this" affordance rather than a global timer.
  items.forEach(function (li, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-ghost btn-sm';
    b.style.marginTop = '.8rem';
    b.textContent = i === items.length - 1 ? 'Done' : 'Next';
    b.hidden = true;                       // no stepping before Begin
    b.addEventListener('click', function () {
      if (idx < 0) return;                 // ignore clicks on a session that never started
      advance(i + 1);
    });
    li.querySelector('div').appendChild(b);
    li.dataset.hasBtn = '1';
  });

  function advance(next) {
    if (idx < 0) return;                   // not started
    idx = next;
    if (idx >= items.length) return finish();
    paint();
    items[idx].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function tick() {
    left -= 1;
    if (left <= 0) {
      left = 0;
      ring(1);
      clearInterval(timer); timer = null;
      finish();                            // sitting through the 30s IS completing it
      return;
    }
    ring((TOTAL - left) / TOTAL);
    label(left, left === 1 ? 'second' : 'seconds');
  }

  function start() {
    reset(true);
    begin.hidden = true;
    stop.hidden = false;
    done.hidden = true;
    items.forEach(function (li) { var b = li.querySelector('button'); if (b) b.hidden = false; });
    idx = 0; paint();
    timer = setInterval(tick, 1000);
  }

  function finish() {
    if (timer) { clearInterval(timer); timer = null; }
    items.forEach(function (li) { li.classList.remove('active'); li.classList.add('done'); });
    done.hidden = false;
    done.setAttribute('role', 'status');
    label('✓', 'complete');
    ring(1);
    done.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function reset(keepButtons) {
    if (timer) { clearInterval(timer); timer = null; }
    left = TOTAL; idx = -1;
    ring(0);
    label(TOTAL, 'seconds');
    items.forEach(function (li) {
      li.classList.remove('active', 'done');
      var b = li.querySelector('button'); if (b) b.hidden = true;
    });
    done.hidden = true;
    if (!keepButtons) { begin.hidden = false; stop.hidden = true; }
  }

  begin.addEventListener('click', start);
  stop.addEventListener('click', function () { reset(false); });

  reset(false);
})();
