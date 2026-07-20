// ═══════════════════════════════════════════════════════════════
// CONFIG PANEL — shared across all projects
// ═══════════════════════════════════════════════════════════════

var CONFIG = (function() {
  function createPanel() {
    var cfg = AI.getConfig();
    var overlay = document.getElementById('config-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'config-overlay';
      overlay.className = 'config-overlay';
      overlay.innerHTML = '<div class="config-panel">' +
        '<h2>CONFIGURATION</h2>' +
        '<label>LLM Endpoint<input type="text" id="cfg-endpoint" placeholder="https://api.deepseek.com"></label>' +
        '<label>Model<input type="text" id="cfg-model" placeholder="deepseek-chat"></label>' +
        '<label>API Key<input type="password" id="cfg-apikey" placeholder="sk-..."></label>' +
        '<label class="row-chk"><span>Streaming</span><input type="checkbox" id="cfg-stream" checked></label>' +
        '<label class="row-chk"><span>Thinking mode</span><input type="checkbox" id="cfg-thinking"></label>' +
        '<label>Reasoning effort<select id="cfg-effort">' +
          '<option value="high">high</option><option value="max">max</option><option value="medium">medium</option><option value="low">low</option>' +
        '</select></label>' +
        '<div class="config-buttons">' +
          '<button onclick="CONFIG.apply()">APPLY</button>' +
          '<button onclick="CONFIG.close()">CLOSE</button>' +
        '</div>' +
      '</div>';
      document.body.appendChild(overlay);
      overlay.addEventListener('click', function(e) { if (e.target === overlay) CONFIG.close(); });
    }
    // Populate fields
    var ep = document.getElementById('cfg-endpoint');
    var mo = document.getElementById('cfg-model');
    var ak = document.getElementById('cfg-apikey');
    var st = document.getElementById('cfg-stream');
    var th = document.getElementById('cfg-thinking');
    var ef = document.getElementById('cfg-effort');
    if (ep) ep.value = cfg.endpoint || '';
    if (mo) mo.value = cfg.model || '';
    if (ak) ak.value = cfg.apikey || '';
    if (st) st.checked = cfg.streamEnabled;
    if (th) th.checked = cfg.thinkingEnabled;
    if (ef) ef.value = cfg.reasoningEffort || 'high';
    overlay.classList.add('open');
  }

  function apply() {
    AI.setConfig({
      endpoint: document.getElementById('cfg-endpoint').value.trim(),
      model: document.getElementById('cfg-model').value.trim(),
      apikey: document.getElementById('cfg-apikey').value.trim(),
      streamEnabled: document.getElementById('cfg-stream').checked,
      thinkingEnabled: document.getElementById('cfg-thinking').checked,
      reasoningEffort: document.getElementById('cfg-effort').value
    });
    close();
  }

  function close() {
    var overlay = document.getElementById('config-overlay');
    if (overlay) overlay.classList.remove('open');
  }

  return { createPanel: createPanel, apply: apply, close: close };
})();
