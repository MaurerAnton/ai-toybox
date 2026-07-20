// ═══════════════════════════════════════════════════════════════
// CONFIG PANEL — shared across all projects via localStorage
// Same localStorage key = same config in every project
// ═══════════════════════════════════════════════════════════════

var CONFIG = (function() {
  var PRESETS = {
    'gemini-free': {
      label: 'Google Gemini (FREE)',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai',
      model: 'gemini-2.0-flash',
      apikey: '',
      note: 'Free tier: 15 RPM, 1M tokens/day. Get key at aistudio.google.com/apikey'
    },
    'deepseek': {
      label: 'DeepSeek',
      endpoint: 'https://api.deepseek.com',
      model: 'deepseek-chat',
      apikey: '',
      note: 'Very cheap. Get key at platform.deepseek.com'
    },
    'openai': {
      label: 'OpenAI',
      endpoint: 'https://api.openai.com',
      model: 'gpt-4o',
      apikey: '',
      note: 'Get key at platform.openai.com'
    },
    'ollama': {
      label: 'Ollama (local)',
      endpoint: 'http://localhost:11434/v1',
      model: 'llama3',
      apikey: 'ollama',
      note: 'Run: ollama serve'
    },
    'llamacpp': {
      label: 'llama.cpp server',
      endpoint: 'http://localhost:8080/v1',
      model: 'local',
      apikey: 'none',
      note: 'Run: llama-server -m model.gguf'
    }
  };

  function createPanel() {
    var cfg = AI.getConfig();
    var overlay = document.getElementById('config-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'config-overlay';
      overlay.className = 'config-overlay';

      var presetsHtml = '<div style="margin-bottom:12px"><div style="font-size:10px;letter-spacing:2px;color:var(--grey);margin-bottom:6px">QUICK PRESETS</div>';
      presetsHtml += '<div style="display:flex;flex-wrap:wrap;gap:4px" id="preset-btns">';
      for (var key in PRESETS) {
        presetsHtml += '<button class="btn" style="font-size:10px;padding:4px 8px" onclick="CONFIG.applyPreset(\'' + key + '\')">' + PRESETS[key].label + '</button>';
      }
      presetsHtml += '</div></div>';

      overlay.innerHTML = '<div class="config-panel" style="width:460px">' +
        '<h2>CONFIGURATION</h2>' +
        '<div style="font-size:11px;color:var(--green);padding:6px 10px;background:rgba(0,255,136,0.05);border:1px solid var(--border);border-radius:4px;margin-bottom:8px">' +
          'Config is shared across all projects (same localStorage)' +
        '</div>' +
        presetsHtml +
        '<label>LLM Endpoint<input type="text" id="cfg-endpoint" placeholder="https://generativelanguage.googleapis.com/v1beta/openai"></label>' +
        '<label>Model<input type="text" id="cfg-model" placeholder="gemini-2.0-flash"></label>' +
        '<label>API Key<input type="password" id="cfg-apikey" placeholder="Paste your key here..."></label>' +
        '<div style="font-size:10px;color:var(--grey);margin-top:-8px;margin-bottom:8px" id="preset-note"></div>' +
        '<label class="row-chk"><span>Streaming</span><input type="checkbox" id="cfg-stream" checked></label>' +
        '<label class="row-chk"><span>Thinking mode (DeepSeek Pro)</span><input type="checkbox" id="cfg-thinking"></label>' +
        '<label>Reasoning effort<select id="cfg-effort">' +
          '<option value="high">high</option><option value="max">max</option><option value="medium">medium</option><option value="low">low</option>' +
        '</select></label>' +
        '<div class="config-buttons">' +
          '<button class="btn primary" onclick="CONFIG.apply()">SAVE & APPLY</button>' +
          '<button class="btn" onclick="CONFIG.close()">CLOSE</button>' +
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
    if (st) st.checked = cfg.streamEnabled !== false;
    if (th) th.checked = cfg.thinkingEnabled || false;
    if (ef) ef.value = cfg.reasoningEffort || 'high';
    document.getElementById('preset-note').textContent = '';
    overlay.classList.add('open');
  }

  function applyPreset(key) {
    var p = PRESETS[key];
    if (!p) return;
    document.getElementById('cfg-endpoint').value = p.endpoint;
    document.getElementById('cfg-model').value = p.model;
    document.getElementById('cfg-apikey').value = p.apikey;
    document.getElementById('preset-note').textContent = p.note;
    document.getElementById('preset-note').style.color = 'var(--cyan)';
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
    // Show confirmation
    var cfg = AI.getConfig();
    var names = [];
    for (var k in PRESETS) {
      if (PRESETS[k].endpoint === cfg.endpoint) { names.push(PRESETS[k].label); break; }
    }
    var who = names.length ? names[0] : cfg.endpoint;
    showToast('Config saved: ' + who + ' / ' + cfg.model);
  }

  function close() {
    var overlay = document.getElementById('config-overlay');
    if (overlay) overlay.classList.remove('open');
  }

  function showToast(msg) {
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:60px;left:50%;transform:translateX(-50%);background:var(--bg2);border:1px solid var(--green);color:var(--green);font-family:var(--font-mono);font-size:12px;padding:8px 16px;border-radius:4px;z-index:200;animation:fadeIn 0.3s';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function() { t.remove(); }, 2500);
  }

  // Auto-show config on first visit (no endpoint set)
  function checkFirstRun() {
    var cfg = AI.getConfig();
    if (!cfg.endpoint) {
      setTimeout(function() { createPanel(); }, 500);
    }
  }

  return { createPanel: createPanel, applyPreset: applyPreset, apply: apply, close: close, checkFirstRun: checkFirstRun };
})();
