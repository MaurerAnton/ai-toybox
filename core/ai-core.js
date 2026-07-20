// ═══════════════════════════════════════════════════════════════
// AI-CORE — LLM communication layer (extracted from teletraan)
// Reference: github.com/MaurerAnton/teletraan-1
// ═══════════════════════════════════════════════════════════════

var AI = (function() {
  var cfg = {
    endpoint: '',
    model: '',
    apikey: '',
    streamEnabled: true,
    thinkingEnabled: false,
    reasoningEffort: 'high'
  };

  var currentAbortController = null;

  function buildRequestBody(messages, tools) {
    var body = {
      model: cfg.model,
      messages: messages,
      stream: cfg.streamEnabled,
    };
    if (cfg.thinkingEnabled) {
      body.thinking = {type: 'enabled'};
      body.reasoning_effort = cfg.reasoningEffort || 'high';
      body.max_tokens = 4096;
    } else {
      body.temperature = 0.7;
      body.top_p = 1.0;
      body.max_tokens = 2048;
    }
    if (tools && tools.length > 0) body.tools = tools;
    return body;
  }

  async function fetchWithRetry(url, options, maxRetries) {
    maxRetries = maxRetries || 3;
    var lastError;
    for (var attempt = 0; attempt < maxRetries; attempt++) {
      try {
        var controller = new AbortController();
        currentAbortController = controller;
        var timeout = setTimeout(function() { controller.abort(); }, 120000);
        var res = await fetch(url, Object.assign({}, options, {signal: controller.signal}));
        clearTimeout(timeout);
        if ((res.status === 429 || res.status >= 500) && attempt < maxRetries - 1) {
          var delay = Math.pow(2, attempt) * 1000;
          await new Promise(function(r) { setTimeout(r, delay); });
          continue;
        }
        return res;
      } catch(e) {
        currentAbortController = null;
        lastError = e;
        if (e.name === 'AbortError') throw e;
        if (attempt < maxRetries - 1) {
          await new Promise(function(r) { setTimeout(r, Math.pow(2, attempt) * 1000); });
          continue;
        }
      }
    }
    throw lastError;
  }

  async function parseError(res) {
    var detail = '';
    try {
      var err = await res.json();
      detail = (err.error && err.error.message) || err.message || JSON.stringify(err);
    } catch(e) {
      try { detail = await res.text(); } catch(e2) {}
    }
    if (!detail) detail = 'HTTP ' + res.status;
    return detail;
  }

  function mergeToolCallDelta(existing, delta) {
    if (!existing) {
      return {
        index: delta.index || 0,
        id: delta.id || '',
        type: delta.type || 'function',
        function: {name: (delta.function && delta.function.name) || '', arguments: (delta.function && delta.function.arguments) || ''}
      };
    }
    if (delta.function) {
      if (!existing.function) existing.function = {name:'', arguments:''};
      if (delta.function.name) existing.function.name = delta.function.name;
      if (delta.function.arguments) existing.function.arguments += delta.function.arguments;
    }
    if (delta.id && !existing.id) existing.id = delta.id;
    if (delta.type && !existing.type) existing.type = delta.type;
    return existing;
  }

  async function streamChat(messages, tools, callbacks) {
    var onReasoning = callbacks.onReasoning || function(){};
    var onContent = callbacks.onContent || function(){};
    var onToolCalls = callbacks.onToolCalls || function(){};
    var onDone = callbacks.onDone || function(){};
    var onError = callbacks.onError || function(){};

    if (!cfg.endpoint || !cfg.model) {
      onError('No endpoint or model configured. Open CONFIG to set.');
      return null;
    }

    var url = cfg.endpoint.replace(/\/+$/, '') + '/chat/completions';
    var headers = {'Content-Type':'application/json'};
    if (cfg.apikey) headers['Authorization'] = 'Bearer ' + cfg.apikey;
    var body = buildRequestBody(messages, tools);

    var res;
    try {
      res = await fetchWithRetry(url, {method:'POST', headers: headers, body: JSON.stringify(body)});
    } catch(e) {
      onError('Network error: ' + e.message);
      return null;
    }
    if (!res.ok) {
      var detail = await parseError(res);
      onError('API error: ' + detail);
      return null;
    }

    if (!cfg.streamEnabled) {
      try {
        var data = await res.json();
        var choice = data.choices && data.choices[0];
        if (!choice) { onError('No response from model.'); return null; }
        var msg = choice.message || {};
        if (msg.reasoning_content) onReasoning(msg.reasoning_content);
        if (msg.content) onContent(msg.content);
        if (msg.tool_calls && msg.tool_calls.length) onToolCalls(msg.tool_calls);
        onDone(msg);
        return msg;
      } catch(e) {
        onError('Parse error: ' + e.message);
        return null;
      } finally {
        currentAbortController = null;
      }
    }

    // Streaming
    var reader = res.body.getReader();
    var decoder = new TextDecoder();
    var buffer = '';
    var reasoning = '', content = '';
    var toolCalls = [];
    var finalMsg = {role:'assistant', content:'', reasoning_content:''};

    try {
      while (true) {
        var chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, {stream:true});
        var lines = buffer.split('\n');
        buffer = lines.pop();
        for (var i = 0; i < lines.length; i++) {
          var trimmed = lines[i].trim();
          if (!trimmed.startsWith('data: ')) continue;
          var d = trimmed.slice(6);
          if (d === '[DONE]') continue;
          try {
            var parsed = JSON.parse(d);
            var delta = parsed.choices && parsed.choices[0] && parsed.choices[0].delta;
            if (!delta) continue;
            if (delta.reasoning_content) {
              reasoning += delta.reasoning_content;
              finalMsg.reasoning_content = reasoning;
              onReasoning(delta.reasoning_content);
            }
            if (delta.content) {
              content += delta.content;
              finalMsg.content = content;
              onContent(delta.content);
            }
            if (delta.tool_calls) {
              for (var j = 0; j < delta.tool_calls.length; j++) {
                var tc = delta.tool_calls[j];
                var idx = tc.index || 0;
                toolCalls[idx] = mergeToolCallDelta(toolCalls[idx] || null, tc);
              }
            }
          } catch(e) {}
        }
      }
    } catch(e) {
      onError('Stream error: ' + e.message);
      return null;
    } finally {
      try { reader.releaseLock(); } catch(e) {}
      currentAbortController = null;
    }

    if (toolCalls.length > 0) {
      finalMsg.tool_calls = toolCalls.filter(function(tc){return !!tc;});
      onToolCalls(finalMsg.tool_calls);
    }
    onDone(finalMsg);
    return finalMsg;
  }

  function abort() {
    if (currentAbortController) {
      try { currentAbortController.abort(); } catch(e) {}
      currentAbortController = null;
    }
  }

  // Config persistence via localStorage
  function loadConfig() {
    try {
      var saved = localStorage.getItem('ai-toybox-config');
      if (saved) {
        var parsed = JSON.parse(saved);
        Object.keys(cfg).forEach(function(k) {
          if (parsed[k] !== undefined) cfg[k] = parsed[k];
        });
      }
    } catch(e) {}
  }

  function saveConfig() {
    try {
      localStorage.setItem('ai-toybox-config', JSON.stringify(cfg));
    } catch(e) {}
  }

  function setConfig(newCfg) {
    Object.keys(newCfg).forEach(function(k) {
      if (cfg[k] !== undefined) cfg[k] = newCfg[k];
    });
    saveConfig();
  }

  function getConfig() {
    return Object.assign({}, cfg);
  }

  // Init
  loadConfig();

  return {
    streamChat: streamChat,
    abort: abort,
    setConfig: setConfig,
    getConfig: getConfig,
    loadConfig: loadConfig,
    saveConfig: saveConfig
  };
})();
