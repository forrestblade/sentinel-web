/* Sentinel Dashboard — client-side JS */

const STATE_COLORS = {
  idle: 'state-idle',
  planning: 'state-planning',
  developing: 'state-developing',
  reviewing: 'state-reviewing'
};

function formatTime(ts) {
  return new Date(ts * 1000).toLocaleTimeString();
}

function formatUptime(firstTs, lastTs) {
  if (firstTs === null || lastTs === null) return '--';
  var seconds = Math.round(lastTs - firstTs);
  if (seconds < 60) return seconds + 's';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ' + (seconds % 60) + 's';
  var h = Math.floor(seconds / 3600);
  var m = Math.floor((seconds % 3600) / 60);
  return h + 'h ' + m + 'm';
}

function truncateTool(name) {
  if (name.length <= 40) return name;
  return name.slice(0, 37) + '...';
}

/* Fetch helpers */
function fetchJson(url) {
  return fetch(url).then(function(res) { return res.json(); });
}

/* State */
function refreshState() {
  fetchJson('/api/state').then(function(state) {
    var badge = document.getElementById('state-badge');
    badge.textContent = state.current || 'unknown';
    badge.className = 'badge ' + (STATE_COLORS[state.current] || 'state-unknown');
  }).catch(function() {
    var badge = document.getElementById('state-badge');
    badge.textContent = 'error';
    badge.className = 'badge state-unknown';
  });
}

/* Stats */
function refreshStats() {
  fetchJson('/api/stats').then(function(stats) {
    document.getElementById('stat-total').textContent = stats.totalReceipts.toLocaleString();
    document.getElementById('stat-tools').textContent = stats.uniqueTools;
    document.getElementById('stat-uptime').textContent = formatUptime(stats.firstTimestamp, stats.lastTimestamp);
    populateFilterOptions(stats);
    renderTimeline(stats);
  }).catch(function() {
    document.getElementById('stat-total').textContent = '!';
    document.getElementById('stat-tools').textContent = '!';
    document.getElementById('stat-uptime').textContent = '!';
  });
}

/* Filter dropdowns */
var filtersPopulated = false;

function populateFilterOptions(stats) {
  if (filtersPopulated) return;
  filtersPopulated = true;

  var toolSelect = document.getElementById('filter-tool');
  var eventSelect = document.getElementById('filter-event');
  var stateSelect = document.getElementById('filter-state');

  Object.keys(stats.toolCounts).sort().forEach(function(tool) {
    var opt = document.createElement('option');
    opt.value = tool;
    opt.textContent = truncateTool(tool) + ' (' + stats.toolCounts[tool] + ')';
    toolSelect.appendChild(opt);
  });

  Object.keys(stats.eventCounts).sort().forEach(function(event) {
    var opt = document.createElement('option');
    opt.value = event;
    opt.textContent = event + ' (' + stats.eventCounts[event] + ')';
    eventSelect.appendChild(opt);
  });

  Object.keys(stats.stateCounts).sort().forEach(function(state) {
    var opt = document.createElement('option');
    opt.value = state;
    opt.textContent = state + ' (' + stats.stateCounts[state] + ')';
    stateSelect.appendChild(opt);
  });
}

/* Receipts table */
function buildFilterQuery() {
  var tool = document.getElementById('filter-tool').value;
  var event = document.getElementById('filter-event').value;
  var state = document.getElementById('filter-state').value;
  var limit = document.getElementById('filter-limit').value;
  var params = new URLSearchParams();
  if (tool) params.set('tool', tool);
  if (event) params.set('event', event);
  if (state) params.set('state', state);
  if (limit) params.set('limit', limit);
  var qs = params.toString();
  return qs ? '?' + qs : '';
}

function refreshReceipts() {
  var query = buildFilterQuery();
  fetchJson('/api/receipts' + query).then(function(receipts) {
    var tbody = document.getElementById('receipts-body');
    if (!Array.isArray(receipts) || receipts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">No receipts</td></tr>';
      return;
    }
    var rows = receipts.map(function(r) {
      return '<tr>' +
        '<td>' + r.seq + '</td>' +
        '<td>' + formatTime(r.timestamp) + '</td>' +
        '<td class="tool-name">' + escapeHtml(truncateTool(r.tool_name)) + '</td>' +
        '<td class="event-' + escapeHtml(r.event) + '">' + escapeHtml(r.event) + '</td>' +
        '<td>' + escapeHtml(r.state) + '</td>' +
      '</tr>';
    });
    tbody.innerHTML = rows.join('');
  }).catch(function() {
    var tbody = document.getElementById('receipts-body');
    tbody.innerHTML = '<tr><td colspan="5" class="empty">Error loading receipts</td></tr>';
  });
}

function escapeHtml(text) {
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* Verify */
function handleVerify() {
  var btn = document.getElementById('btn-verify');
  var resultEl = document.getElementById('verify-result');
  btn.disabled = true;
  resultEl.textContent = 'Verifying...';
  resultEl.className = 'verify-result';

  fetchJson('/api/verify').then(function(result) {
    btn.disabled = false;
    if (result.valid) {
      resultEl.textContent = result.message;
      resultEl.className = 'verify-result valid';
    } else {
      resultEl.textContent = result.message || result.error;
      resultEl.className = 'verify-result invalid';
    }
  }).catch(function(err) {
    btn.disabled = false;
    resultEl.textContent = 'Error: ' + err.message;
    resultEl.className = 'verify-result error';
  });
}

/* Timeline */
function renderTimeline(stats) {
  var container = document.getElementById('timeline-bars');
  container.innerHTML = '';

  var counts = stats.eventCounts || {};
  var events = Object.keys(counts).sort();
  if (events.length === 0) return;

  var max = Math.max.apply(null, events.map(function(e) { return counts[e]; }));
  if (max === 0) return;

  events.forEach(function(event) {
    var bar = document.createElement('div');
    bar.className = 'timeline-bar';
    var pct = Math.max(4, Math.round((counts[event] / max) * 100));
    bar.style.height = pct + '%';
    bar.title = event + ': ' + counts[event];
    container.appendChild(bar);
  });
}

/* Refresh all */
function refreshAll() {
  refreshState();
  refreshStats();
  refreshReceipts();
}

/* Event listeners */
document.getElementById('btn-verify').addEventListener('click', handleVerify);
document.getElementById('filter-tool').addEventListener('change', refreshReceipts);
document.getElementById('filter-event').addEventListener('change', refreshReceipts);
document.getElementById('filter-state').addEventListener('change', refreshReceipts);
document.getElementById('filter-limit').addEventListener('change', refreshReceipts);

/* Initial load + auto-refresh */
refreshAll();
setInterval(refreshAll, 5000);
