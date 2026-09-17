// js/player.js
// Joy Up (TM) session player.
//
// Mounts a Mux Video player into every element that matches:
//   <div class="video" data-playback-id="MUX_PLAYBACK_ID" ...></div>
//
// Load once at the bottom of the layout:
//   <script src="/js/player.js" defer></script>
//
// SECURITY (read before shipping):
//   The client-side isSignedIn() check is a UX shortcut. It is NOT the
//   security boundary. Two independent server-side conditions must hold:
//     1. The Mux asset MUST be created with playback_policy: "signed".
//        A public playback id lets any visitor read data-playback-id
//        out of the DOM and stream stream.mux.com/{id}.m3u8 directly.
//     2. TOKEN_ENDPOINT MUST verify the viewer's server-side session,
//        confirm active membership, and only then mint a signed JWT
//        using the Mux RSA private key. The private key never leaves
//        the server. Do not ship it to the browser under any name.
//   Do not launch to real members until both conditions are verified.

(function () {
  'use strict';

  // Version-pinned Mux Player from jsDelivr. Bump deliberately.
  // TODO: once pinned, add integrity="sha384-..." and crossorigin="anonymous"
  // by moving this to a static <script> tag in the layout.
  var MUX_PLAYER_VERSION = '3.5.1';
  var MUX_PLAYER_SRC = 'https://cdn.jsdelivr.net/npm/@mux/mux-player@' + MUX_PLAYER_VERSION;

  var TOKEN_ENDPOINT = '/api/mux/playback-token';
  var CUSTOM_ELEMENT_TIMEOUT_MS = 8000;

  function isSignedIn() {
    try {
      return document.cookie.split(';').some(function (c) {
        return c.trim().indexOf('juu_session=') === 0;
      });
    } catch (e) {
      return false;
    }
  }

  function getViewerId() {
    var meta = document.querySelector('meta[name="joyup-viewer-id"]');
    return meta ? meta.getAttribute('content') : null;
  }

  // Singleton loader. Resets on failure so a later mount attempt can retry.
  var muxPlayerReady = null;
  function ensureMuxPlayerLoaded() {
    if (muxPlayerReady) return muxPlayerReady;

    muxPlayerReady = new Promise(function (resolve, reject) {
      if (window.customElements && window.customElements.get('mux-player')) {
        resolve();
        return;
      }
      var existing = document.querySelector('script[data-mux-player]');
      if (!existing) {
        var s = document.createElement('script');
        s.src = MUX_PLAYER_SRC;
        s.defer = true;
        s.setAttribute('data-mux-player', '');
        s.onerror = function () { reject(new Error('mux_player_script_failed')); };
        document.head.appendChild(s);
      }

      if (window.customElements && window.customElements.whenDefined) {
        var timeoutId;
        var timeoutPromise = new Promise(function (_, rej) {
          timeoutId = setTimeout(function () {
            rej(new Error('mux_player_define_timeout'));
          }, CUSTOM_ELEMENT_TIMEOUT_MS);
        });
        var whenDefined = window.customElements.whenDefined('mux-player').then(function () {
          clearTimeout(timeoutId);
        });
        Promise.race([whenDefined, timeoutPromise]).then(resolve, reject);
      } else {
        var tries = 0;
        var id = setInterval(function () {
          tries += 1;
          if (window.customElements && window.customElements.get('mux-player')) {
            clearInterval(id);
            resolve();
          } else if (tries > 130) {
            clearInterval(id);
            reject(new Error('mux_player_timeout'));
          }
        }, 60);
      }
    });

    muxPlayerReady.catch(function () {
      // Allow a later mount attempt to retry the load.
      muxPlayerReady = null;
    });

    return muxPlayerReady;
  }

  function fetchPlaybackToken(playbackId) {
    return fetch(
      TOKEN_ENDPOINT + '?playback_id=' + encodeURIComponent(playbackId),
      { credentials: 'include' }
    ).then(function (res) {
      if (res.status === 401 || res.status === 403) {
        var authErr = new Error('not_authorized');
        authErr.kind = 'signed_out';
        throw authErr;
      }
      if (!res.ok) {
        throw new Error('token_http_' + res.status);
      }
      return res.json();
    }).then(function (data) {
      if (!data || !data.token) {
        throw new Error('token_missing');
      }
      return data;
    });
  }

  function renderFallback(container, kind) {
    // kind: 'signed_out' | 'playback_failed' | 'misconfigured'
    while (container.firstChild) container.removeChild(container.firstChild);

    var box = document.createElement('div');
    box.className = 'video-fallback';
    box.setAttribute('data-fallback-kind', kind);

    var msg = document.createElement('p');
    msg.className = 'video-fallback-msg';
    // Scope aria-live to the message only, not the action buttons.
    msg.setAttribute('role', 'status');

    if (kind === 'playback_failed') {
      msg.textContent = 'This session is not playing right now. Please try again in a moment.';
    } else if (kind === 'misconfigured') {
      msg.textContent = 'This session is not available yet.';
    } else {
      msg.textContent = 'This session is member-only. Sign in or join.';
    }
    box.appendChild(msg);

    if (kind === 'signed_out') {
      var actions = document.createElement('div');
      actions.className = 'video-fallback-actions';

      var signIn = document.createElement('a');
      signIn.className = 'video-fallback-btn';
      signIn.href = '/login.html';
      signIn.textContent = 'Sign in';

      var join = document.createElement('a');
      join.className = 'video-fallback-btn video-fallback-btn-primary';
      join.href = '/members.html';
      join.textContent = 'Join';

      actions.appendChild(signIn);
      actions.appendChild(join);
      box.appendChild(actions);
    }

    container.appendChild(box);
  }

  function mountOne(container) {
    if (container.getAttribute('data-mounted') === '1') return;
    container.setAttribute('data-mounted', '1');

    var playbackId = container.getAttribute('data-playback-id');
    if (!playbackId || playbackId === 'PLACEHOLDER') {
      renderFallback(container, 'misconfigured');
      return;
    }

    if (!isSignedIn()) {
      renderFallback(container, 'signed_out');
      return;
    }

    Promise.all([ensureMuxPlayerLoaded(), fetchPlaybackToken(playbackId)])
      .then(function (results) {
        var tokenData = results[1];

        while (container.firstChild) container.removeChild(container.firstChild);

        var player = document.createElement('mux-player');
        player.setAttribute('playback-id', playbackId);
        player.setAttribute('playback-token', tokenData.token);
        // Optional signed sub-tokens. Storyboard covers scrub preview.
        // Thumbnail covers the small preview poster network call.
        if (tokenData.storyboard_token) {
          player.setAttribute('storyboard-token', tokenData.storyboard_token);
        }
        if (tokenData.thumbnail_token) {
          player.setAttribute('thumbnail-token', tokenData.thumbnail_token);
        }
        player.setAttribute('stream-type', 'on-demand');

        var title = container.getAttribute('data-title') || '';
        if (title) {
          player.setAttribute('metadata-video-title', title);
          player.setAttribute('aria-label', 'Video player. ' + title + '.');
        }

        // Roll-up id: keeps Mux Data views grouped when a video gets
        // republished under a new playback id. Optional.
        var videoId = container.getAttribute('data-video-id');
        if (videoId) player.setAttribute('metadata-video-id', videoId);

        var viewerId = container.getAttribute('data-viewer-id') || getViewerId();
        if (viewerId) player.setAttribute('metadata-viewer-user-id', viewerId);

        var poster = container.getAttribute('data-poster');
        if (poster) player.setAttribute('poster', poster);

        // TODO: verify #b98a2e (or any chosen accent) meets 3:1 contrast
        // against the controls backdrop across bright and dark video
        // frames (WCAG 1.4.11). Consider a solid darker controls backdrop.
        player.setAttribute('accent-color', '#b98a2e');

        player.addEventListener('error', function () {
          container.setAttribute('data-mounted', '0');
          renderFallback(container, 'playback_failed');
        });

        container.appendChild(player);
      })
      .catch(function (err) {
        container.setAttribute('data-mounted', '0');
        if (err && err.kind === 'signed_out') {
          renderFallback(container, 'signed_out');
        } else {
          renderFallback(container, 'playback_failed');
        }
      });
  }

  function mountAll(root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll('.video[data-playback-id]');
    for (var i = 0; i < nodes.length; i += 1) {
      mountOne(nodes[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { mountAll(); });
  } else {
    mountAll();
  }

  window.JoyUpPlayer = { mount: mountAll };
}());
