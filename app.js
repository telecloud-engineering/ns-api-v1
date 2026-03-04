(() => {
  let apiData = [];
  let groupedData = {};
  let currentEndpoint = null;
  let currentLang = 'shell';

  const $ = id => document.getElementById(id);
  const $$ = (selector, parent = document) => parent.querySelectorAll(selector);

  const escapeHtml = s => (s ?? '').toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const normalize = s => (s ?? '').toString().toLowerCase().trim();

  function stripHtmlTags(str) {
    return str.replace(/<[^>]*>/g, '');
  }

  function groupEndpoints(data) {
    const groups = {};
    data.forEach(endpoint => {
      const groupName = endpoint.group || 'Uncategorized';
      if (!groups[groupName]) {
        groups[groupName] = {
          name: groupName,
          endpoints: []
        };
      }
      groups[groupName].endpoints.push(endpoint);
    });
    
    Object.values(groups).forEach(group => {
      group.endpoints.sort((a, b) => {
        const titleA = (a.title || a.name || '').toLowerCase();
        const titleB = (b.title || b.name || '').toLowerCase();
        return titleA.localeCompare(titleB);
      });
    });
    
    return groups;
  }

  function renderSidebar() {
    const container = $('api-groups');
    const sortedGroups = Object.keys(groupedData).sort();
    
    let html = '';
    sortedGroups.forEach(groupName => {
      const group = groupedData[groupName];
      const groupId = groupName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      html += `
        <div class="nav-group">
          <div class="api-group-item" data-group="${groupId}">
            <span>${escapeHtml(groupName)}</span>
            <svg class="expand-icon" width="12" height="12" viewBox="0 0 12 12">
              <path d="M4 5l3 3 3-3" stroke="currentColor" stroke-width="1.5" fill="none"/>
            </svg>
          </div>
          <div class="api-endpoints" id="group-${groupId}" style="display: none;">
      `;
      
      group.endpoints.forEach((endpoint, idx) => {
        const method = (endpoint.type || 'POST').toUpperCase();
        const title = endpoint.title || endpoint.name || 'Untitled';
        const endpointId = `${groupId}-${idx}`;
        
        html += `
          <div class="api-endpoint-item" data-endpoint-id="${endpointId}" data-group="${groupName}" data-idx="${idx}">
            <span class="endpoint-method ${method.toLowerCase()}">${method}</span>
            <span class="endpoint-title">${escapeHtml(title)}</span>
          </div>
        `;
      });
      
      html += '</div></div>';
    });
    
    container.innerHTML = html;
    
    // Add click handlers for groups
    $$('.api-group-item').forEach(item => {
      item.addEventListener('click', () => {
        const groupId = item.dataset.group;
        const endpoints = $(`group-${groupId}`);
        const isExpanded = endpoints.style.display !== 'none';
        
        // Close all other groups
        $$('.api-endpoints').forEach(el => el.style.display = 'none');
        $$('.api-group-item').forEach(el => el.classList.remove('expanded'));
        
        if (!isExpanded) {
          endpoints.style.display = 'block';
          item.classList.add('expanded');
        }
      });
    });
    
    // Add click handlers for endpoints
    $$('.api-endpoint-item').forEach(item => {
      item.addEventListener('click', () => {
        const groupName = item.dataset.group;
        const idx = parseInt(item.dataset.idx);
        selectEndpoint(groupName, idx);
        
        // Update active state
        $$('.api-endpoint-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
      });
    });
  }

  function selectEndpoint(groupName, idx) {
    const group = groupedData[groupName];
    if (!group || !group.endpoints[idx]) return;
    
    currentEndpoint = group.endpoints[idx];
    renderEndpoint(currentEndpoint);
    updateCodeExamples();
  }

  function renderEndpoint(endpoint) {
    const method = (endpoint.type || 'POST').toUpperCase();
    const title = endpoint.title || endpoint.name || 'Untitled Endpoint';
    const url = endpoint.url || '';
    const description = endpoint.description || '';
    
    // Update header
    $('endpoint-title').textContent = title;
    
    const methodBadge = $('method-badge');
    methodBadge.textContent = method;
    methodBadge.className = `method-badge ${method.toLowerCase()}`;
    methodBadge.style.display = 'inline-block';
    
    $('endpoint-url').textContent = `/ns-api/${url}`;
    
    // Update description
    const descSection = $('description');
    if (description) {
      descSection.innerHTML = `<p>${escapeHtml(stripHtmlTags(description))}</p>`;
    } else {
      descSection.innerHTML = '<p>No description available for this endpoint.</p>';
    }
    
    // Update parameters
    renderParameters(endpoint);
    
    // Update responses
    renderResponses(endpoint);
  }

  function renderParameters(endpoint) {
    const section = $('params-section');
    const paramsList = $('params-list');
    
    const params = extractParameters(endpoint);
    
    if (params.length === 0) {
      section.style.display = 'none';
      return;
    }
    
    section.style.display = 'block';
    
    let html = '';
    params.forEach(param => {
      const isRequired = !param.optional;
      html += `
        <div class="param-item">
          <div class="param-header">
            <span class="param-name">${escapeHtml(param.field)}</span>
            <span class="param-type">${escapeHtml(param.type || 'string')}</span>
            ${isRequired ? 
              '<span class="param-required">required</span>' : 
              '<span class="param-optional">optional</span>'}
          </div>
          ${param.description ? 
            `<div class="param-desc">${escapeHtml(stripHtmlTags(param.description))}</div>` : ''}
        </div>
      `;
    });
    
    paramsList.innerHTML = html;
  }

  function extractParameters(endpoint) {
    const params = [];
    
    if (endpoint.parameter?.fields) {
      Object.values(endpoint.parameter.fields).forEach(fieldGroup => {
        if (Array.isArray(fieldGroup)) {
          params.push(...fieldGroup);
        }
      });
    }
    
    return params;
  }

  function renderResponses(endpoint) {
    const section = $('responses-section');
    
    // For now, just show default response
    section.style.display = 'block';
    
    if (endpoint.success?.fields) {
      let hasFields = false;
      Object.values(endpoint.success.fields).forEach(fields => {
        if (Array.isArray(fields) && fields.length > 0) {
          hasFields = true;
        }
      });
      
      if (hasFields) {
        // Show response fields exist
        section.innerHTML = `
          <h2>Responses</h2>
          <div class="response-item">
            <div class="response-code success">200</div>
            <div class="response-desc">Successful response with data fields</div>
          </div>
        `;
        return;
      }
    }
    
    section.innerHTML = `
      <h2>Responses</h2>
      <div class="response-item">
        <div class="response-code success">200</div>
        <div class="response-desc">Successful response</div>
      </div>
    `;
  }

  function updateCodeExamples() {
    if (!currentEndpoint) return;
    
    const method = (currentEndpoint.type || 'POST').toUpperCase();
    const url = currentEndpoint.url || '';
    const fullUrl = `https://{server}/ns-api/${url}`;
    
    // Update URL display
    $('url-display').textContent = fullUrl;
    
    // Generate code examples based on selected language
    const examples = generateCodeExamples(currentEndpoint, currentLang);
    $('curl-example').innerHTML = `<code>${escapeHtml(examples.request)}</code>`;
    
    // Show response example if available
    const responseSection = $('response-example');
    if (currentEndpoint.success) {
      responseSection.style.display = 'block';
      $('response-display').textContent = examples.response;
    } else {
      responseSection.style.display = 'none';
    }
  }

  function generateCodeExamples(endpoint, lang) {
    const method = (endpoint.type || 'POST').toUpperCase();
    const url = endpoint.url || '';
    const fullUrl = `https://{server}/ns-api/${url}`;
    const hasAuth = endpoint.header?.fields?.Header?.some(h => h.field === 'Authorization');
    
    const params = extractParameters(endpoint);
    const requiredParams = params.filter(p => !p.optional);
    
    let request = '';
    let response = '{\n  "status": "success",\n  "data": {}\n}';
    
    switch(lang) {
      case 'shell':
        request = generateCurlExample(method, fullUrl, hasAuth, requiredParams);
        break;
      case 'node':
        request = generateNodeExample(method, fullUrl, hasAuth, requiredParams);
        break;
      case 'python':
        request = generatePythonExample(method, fullUrl, hasAuth, requiredParams);
        break;
      case 'php':
        request = generatePhpExample(method, fullUrl, hasAuth, requiredParams);
        break;
      case 'ruby':
        request = generateRubyExample(method, fullUrl, hasAuth, requiredParams);
        break;
      default:
        request = generateCurlExample(method, fullUrl, hasAuth, requiredParams);
    }
    
    return { request, response };
  }

  function generateCurlExample(method, url, hasAuth, params) {
    let curl = `curl -X ${method} \\\n  "${url}"`;
    
    if (hasAuth) {
      curl += ` \\\n  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"`;
    }
    
    if (method !== 'GET' && params.length > 0) {
      curl += ` \\\n  -H "Content-Type: application/json"`;
      curl += ` \\\n  -d '{`;
      params.forEach((p, idx) => {
        const value = p.type === 'Number' ? '0' : `"value"`;
        curl += `\n    "${p.field}": ${value}${idx < params.length - 1 ? ',' : ''}`;
      });
      curl += `\n  }'`;
    }
    
    return curl;
  }

  function generateNodeExample(method, url, hasAuth, params) {
    let code = `const axios = require('axios');\n\n`;
    code += `const response = await axios.${method.toLowerCase()}(\n`;
    code += `  '${url}'`;
    
    if (method !== 'GET' && params.length > 0) {
      code += `,\n  {\n`;
      params.forEach((p, idx) => {
        const value = p.type === 'Number' ? '0' : `'value'`;
        code += `    ${p.field}: ${value}${idx < params.length - 1 ? ',' : ''}\n`;
      });
      code += `  }`;
    }
    
    if (hasAuth) {
      code += `,\n  {\n    headers: {\n      'Authorization': 'Bearer YOUR_ACCESS_TOKEN'\n    }\n  }`;
    }
    
    code += `\n);\n\nconsole.log(response.data);`;
    
    return code;
  }

  function generatePythonExample(method, url, hasAuth, params) {
    let code = `import requests\n\n`;
    
    if (hasAuth) {
      code += `headers = {\n    'Authorization': 'Bearer YOUR_ACCESS_TOKEN'\n}\n\n`;
    }
    
    if (method !== 'GET' && params.length > 0) {
      code += `data = {\n`;
      params.forEach((p, idx) => {
        const value = p.type === 'Number' ? '0' : `'value'`;
        code += `    '${p.field}': ${value}${idx < params.length - 1 ? ',' : ''}\n`;
      });
      code += `}\n\n`;
    }
    
    code += `response = requests.${method.toLowerCase()}(\n    '${url}'`;
    
    if (hasAuth) {
      code += `,\n    headers=headers`;
    }
    
    if (method !== 'GET' && params.length > 0) {
      code += `,\n    json=data`;
    }
    
    code += `\n)\n\nprint(response.json())`;
    
    return code;
  }

  function generatePhpExample(method, url, hasAuth, params) {
    let code = `<?php\n$curl = curl_init();\n\n`;
    code += `curl_setopt_array($curl, [\n`;
    code += `  CURLOPT_URL => "${url}",\n`;
    code += `  CURLOPT_RETURNTRANSFER => true,\n`;
    code += `  CURLOPT_CUSTOMREQUEST => "${method}",\n`;
    
    if (hasAuth) {
      code += `  CURLOPT_HTTPHEADER => [\n`;
      code += `    "Authorization: Bearer YOUR_ACCESS_TOKEN"\n`;
      code += `  ],\n`;
    }
    
    if (method !== 'GET' && params.length > 0) {
      code += `  CURLOPT_POSTFIELDS => json_encode([\n`;
      params.forEach((p, idx) => {
        const value = p.type === 'Number' ? '0' : `"value"`;
        code += `    "${p.field}" => ${value}${idx < params.length - 1 ? ',' : ''}\n`;
      });
      code += `  ])\n`;
    }
    
    code += `]);\n\n`;
    code += `$response = curl_exec($curl);\n`;
    code += `curl_close($curl);\n\n`;
    code += `echo $response;`;
    
    return code;
  }

  function generateRubyExample(method, url, hasAuth, params) {
    let code = `require 'net/http'\nrequire 'json'\n\n`;
    code += `uri = URI('${url}')\n`;
    code += `http = Net::HTTP.new(uri.host, uri.port)\n`;
    code += `http.use_ssl = true\n\n`;
    code += `request = Net::HTTP::${method.charAt(0) + method.slice(1).toLowerCase()}.new(uri)\n`;
    
    if (hasAuth) {
      code += `request['Authorization'] = 'Bearer YOUR_ACCESS_TOKEN'\n`;
    }
    
    if (method !== 'GET' && params.length > 0) {
      code += `request['Content-Type'] = 'application/json'\n`;
      code += `request.body = {\n`;
      params.forEach((p, idx) => {
        const value = p.type === 'Number' ? '0' : `'value'`;
        code += `  ${p.field}: ${value}${idx < params.length - 1 ? ',' : ''}\n`;
      });
      code += `}.to_json\n`;
    }
    
    code += `\nresponse = http.request(request)\n`;
    code += `puts response.body`;
    
    return code;
  }

  function setupEventListeners() {
    // Language tabs
    $$('.lang-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.lang-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentLang = tab.dataset.lang;
        updateCodeExamples();
      });
    });
    
    // Copy buttons
    $$('.copy-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const type = btn.dataset.copy;
        let textToCopy = '';
        
        if (type === 'url' && currentEndpoint) {
          textToCopy = `https://{server}/ns-api/${currentEndpoint.url || ''}`;
        } else if (type === 'curl' && currentEndpoint) {
          const examples = generateCodeExamples(currentEndpoint, currentLang);
          textToCopy = examples.request;
        }
        
        if (textToCopy) {
          await copyToClipboard(textToCopy);
          showCopyFeedback(btn);
        }
      });
    });
    
    // Global search
    const searchInput = $('global-search');
    searchInput.addEventListener('input', (e) => {
      performSearch(e.target.value);
    });
    
    // Keyboard shortcut for search
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
      }
    });
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  function showCopyFeedback(btn) {
    const original = btn.textContent;
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove('copied');
    }, 2000);
  }

  function performSearch(term) {
    const searchTerm = normalize(term);
    
    if (!searchTerm) {
      renderSidebar();
      return;
    }
    
    const results = apiData.filter(endpoint => {
      const searchText = normalize([
        endpoint.type,
        endpoint.url,
        endpoint.title,
        endpoint.name,
        endpoint.group,
        endpoint.description,
        JSON.stringify(endpoint.parameter || {}),
      ].join(' '));
      
      return searchText.includes(searchTerm);
    });
    
    // Update sidebar with search results
    const container = $('api-groups');
    
    if (results.length === 0) {
      container.innerHTML = '<div style="padding: 20px; color: var(--text-muted);">No results found</div>';
      return;
    }
    
    let html = '<div class="nav-group"><div class="sidebar-title">Search Results</div>';
    
    results.forEach((endpoint, idx) => {
      const method = (endpoint.type || 'POST').toUpperCase();
      const title = endpoint.title || endpoint.name || 'Untitled';
      const group = endpoint.group || 'Uncategorized';
      
      html += `
        <div class="api-endpoint-item search-result" data-search-idx="${idx}">
          <span class="endpoint-method ${method.toLowerCase()}">${method}</span>
          <div style="flex: 1; overflow: hidden;">
            <div style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${escapeHtml(title)}</div>
            <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(group)}</div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    // Add click handlers for search results
    $$('.search-result').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.searchIdx);
        currentEndpoint = results[idx];
        renderEndpoint(currentEndpoint);
        updateCodeExamples();
        
        $$('.api-endpoint-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
      });
    });
  }

  async function loadApiData() {
    try {
      const response = await fetch('./netsapiens_v1_api.json');
      apiData = await response.json();
      groupedData = groupEndpoints(apiData);
      
      renderSidebar();
      setupEventListeners();
    } catch (error) {
      console.error('Failed to load API data:', error);
      $('description').innerHTML = '<p style="color: var(--accent-red);">Failed to load API documentation</p>';
    }
  }

  loadApiData();
})();