(() => {
  let apiData = [];
  let groupedData = {};
  let currentEndpoint = null;
  let currentLang = 'shell';
  let serverUrl = '';
  let parameterValues = {};

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
    parameterValues = {}; // Reset parameter values
    renderEndpoint(currentEndpoint);
    renderParameterForm(currentEndpoint);
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
    
    // Update parameters documentation
    renderParametersDocumentation(endpoint);
    
    // Update responses
    renderResponses(endpoint);
  }

  function renderParameterForm(endpoint) {
    const section = $('params-section');
    const paramsForm = $('params-form');
    
    const params = extractParameters(endpoint);
    
    if (params.length === 0) {
      section.style.display = 'none';
      return;
    }
    
    section.style.display = 'block';
    
    let html = '';
    params.forEach(param => {
      const isRequired = !param.optional;
      const fieldType = getInputType(param.type);
      const placeholder = getPlaceholder(param);
      
      html += `
        <div class="param-input-group">
          <div class="param-input-label">
            <span class="param-input-name">${escapeHtml(param.field)}</span>
            <span class="param-input-type">${escapeHtml(param.type || 'string')}</span>
            ${isRequired ? 
              '<span class="param-input-required">required</span>' : ''}
          </div>
          <input 
            type="${fieldType}" 
            class="param-input-field" 
            data-param="${escapeHtml(param.field)}"
            placeholder="${escapeHtml(placeholder)}"
            ${isRequired ? 'required' : ''}
          />
        </div>
      `;
    });
    
    paramsForm.innerHTML = html;
    
    // Add event listeners to parameter inputs
    $$('.param-input-field').forEach(input => {
      input.addEventListener('input', () => {
        const paramName = input.dataset.param;
        parameterValues[paramName] = input.value;
        updateCodeExamples();
      });
    });
  }

  function getInputType(type) {
    if (!type) return 'text';
    const lowerType = type.toLowerCase();
    if (lowerType.includes('number') || lowerType.includes('int')) return 'number';
    if (lowerType.includes('email')) return 'email';
    if (lowerType.includes('url')) return 'url';
    if (lowerType.includes('password')) return 'password';
    return 'text';
  }

  function getPlaceholder(param) {
    if (param.description) {
      const desc = stripHtmlTags(param.description);
      if (desc.length > 50) return desc.substring(0, 47) + '...';
      return desc;
    }
    
    if (param.type) {
      const lowerType = param.type.toLowerCase();
      if (lowerType.includes('number') || lowerType.includes('int')) return '0';
      if (lowerType.includes('email')) return 'user@example.com';
      if (lowerType.includes('url')) return 'https://example.com';
      if (lowerType.includes('date')) return '2024-01-01';
      if (lowerType.includes('time')) return '12:00:00';
      if (lowerType.includes('bool')) return 'true';
    }
    
    return 'Enter value';
  }

  function renderParametersDocumentation(endpoint) {
    const paramsList = $('params-list');
    const params = extractParameters(endpoint);
    
    if (params.length === 0) {
      paramsList.innerHTML = '';
      return;
    }
    
    let html = '<div class="params-documentation">';
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
    html += '</div>';
    
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
    section.style.display = 'block';
    
    if (endpoint.success?.fields) {
      let hasFields = false;
      Object.values(endpoint.success.fields).forEach(fields => {
        if (Array.isArray(fields) && fields.length > 0) {
          hasFields = true;
        }
      });
      
      if (hasFields) {
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

  function buildLiveApiUrl() {
    if (!currentEndpoint) return 'https://{server}/ns-api/';
    
    const baseUrl = serverUrl || '{server}';
    const protocol = baseUrl.includes('://') ? '' : 'https://';
    const url = currentEndpoint.url || '';
    
    return `${protocol}${baseUrl}/ns-api/${url}`;
  }

  function updateCodeExamples() {
    if (!currentEndpoint) return;
    
    // Update URL display
    const liveUrl = buildLiveApiUrl();
    $('url-display').textContent = liveUrl;
    
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
    
    // Update test button state
    const testBtn = $('test-request');
    const testInfo = document.querySelector('.test-info');
    if (serverUrl && Object.keys(parameterValues).length > 0) {
      testInfo.textContent = 'Click to send test request';
      testBtn.disabled = false;
    } else {
      testInfo.textContent = 'Configure server URL and parameters to test';
      testBtn.disabled = true;
    }
  }

  function generateCodeExamples(endpoint, lang) {
    const method = (endpoint.type || 'POST').toUpperCase();
    const liveUrl = buildLiveApiUrl();
    const hasAuth = endpoint.header?.fields?.Header?.some(h => h.field === 'Authorization');
    
    const params = extractParameters(endpoint);
    const requestParams = {};
    
    // Use actual parameter values or defaults
    params.forEach(p => {
      const value = parameterValues[p.field];
      if (value !== undefined && value !== '') {
        requestParams[p.field] = value;
      } else if (!p.optional) {
        // Use placeholder for required params without values
        requestParams[p.field] = getDefaultValue(p);
      }
    });
    
    let request = '';
    let response = '{\n  "status": "success",\n  "data": {}\n}';
    
    switch(lang) {
      case 'shell':
        request = generateCurlExample(method, liveUrl, hasAuth, requestParams);
        break;
      case 'node':
        request = generateNodeExample(method, liveUrl, hasAuth, requestParams);
        break;
      case 'python':
        request = generatePythonExample(method, liveUrl, hasAuth, requestParams);
        break;
      case 'php':
        request = generatePhpExample(method, liveUrl, hasAuth, requestParams);
        break;
      case 'ruby':
        request = generateRubyExample(method, liveUrl, hasAuth, requestParams);
        break;
      default:
        request = generateCurlExample(method, liveUrl, hasAuth, requestParams);
    }
    
    return { request, response };
  }

  function getDefaultValue(param) {
    const type = param.type?.toLowerCase() || 'string';
    if (type.includes('number') || type.includes('int')) return '0';
    if (type.includes('bool')) return 'true';
    if (type.includes('email')) return 'user@example.com';
    return 'value';
  }

  function generateCurlExample(method, url, hasAuth, params) {
    let curl = `curl -X ${method} \\\n  "${url}"`;
    
    if (hasAuth) {
      curl += ` \\\n  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"`;
    }
    
    if (method !== 'GET' && Object.keys(params).length > 0) {
      curl += ` \\\n  -H "Content-Type: application/json"`;
      curl += ` \\\n  -d '${JSON.stringify(params, null, 2).replace(/\n/g, '\n    ')}'`;
    }
    
    return curl;
  }

  function generateNodeExample(method, url, hasAuth, params) {
    let code = `const axios = require('axios');\n\n`;
    
    const configParts = [];
    if (hasAuth) {
      configParts.push(`  headers: {\n    'Authorization': 'Bearer YOUR_ACCESS_TOKEN'\n  }`);
    }
    
    if (method !== 'GET' && Object.keys(params).length > 0) {
      code += `const response = await axios.${method.toLowerCase()}(\n  '${url}',\n  ${JSON.stringify(params, null, 2).replace(/\n/g, '\n  ')}`;
      if (configParts.length > 0) {
        code += `,\n  {\n${configParts.join(',\n')}\n  }`;
      }
    } else {
      code += `const response = await axios.${method.toLowerCase()}('${url}'`;
      if (configParts.length > 0) {
        code += `, {\n${configParts.join(',\n')}\n}`;
      }
    }
    
    code += `\n);\n\nconsole.log(response.data);`;
    return code;
  }

  function generatePythonExample(method, url, hasAuth, params) {
    let code = `import requests\nimport json\n\n`;
    
    if (hasAuth) {
      code += `headers = {\n    'Authorization': 'Bearer YOUR_ACCESS_TOKEN'\n}\n\n`;
    }
    
    if (method !== 'GET' && Object.keys(params).length > 0) {
      code += `data = ${JSON.stringify(params, null, 4).replace(/\n/g, '\n')}\n\n`;
    }
    
    code += `response = requests.${method.toLowerCase()}(\n    '${url}'`;
    
    if (hasAuth) {
      code += `,\n    headers=headers`;
    }
    
    if (method !== 'GET' && Object.keys(params).length > 0) {
      code += `,\n    json=data`;
    }
    
    code += `\n)\n\nprint(response.json())`;
    return code;
  }

  function generatePhpExample(method, url, hasAuth, params) {
    let code = `<?php\n$curl = curl_init();\n\n`;
    code += `$options = [\n`;
    code += `    CURLOPT_URL => "${url}",\n`;
    code += `    CURLOPT_RETURNTRANSFER => true,\n`;
    code += `    CURLOPT_CUSTOMREQUEST => "${method}",\n`;
    
    const headers = [];
    if (hasAuth) {
      headers.push('"Authorization: Bearer YOUR_ACCESS_TOKEN"');
    }
    
    if (method !== 'GET' && Object.keys(params).length > 0) {
      headers.push('"Content-Type: application/json"');
      code += `    CURLOPT_POSTFIELDS => json_encode(${JSON.stringify(params, null, 4).replace(/\n/g, '\n    ')}),\n`;
    }
    
    if (headers.length > 0) {
      code += `    CURLOPT_HTTPHEADER => [\n        ${headers.join(',\n        ')}\n    ],\n`;
    }
    
    code += `];\n\ncurl_setopt_array($curl, $options);\n`;
    code += `$response = curl_exec($curl);\ncurl_close($curl);\n\necho $response;`;
    
    return code;
  }

  function generateRubyExample(method, url, hasAuth, params) {
    let code = `require 'net/http'\nrequire 'json'\n\n`;
    code += `uri = URI('${url}')\nhttp = Net::HTTP.new(uri.host, uri.port)\n`;
    code += `http.use_ssl = uri.scheme == 'https'\n\n`;
    code += `request = Net::HTTP::${method.charAt(0) + method.slice(1).toLowerCase()}.new(uri)\n`;
    
    if (hasAuth) {
      code += `request['Authorization'] = 'Bearer YOUR_ACCESS_TOKEN'\n`;
    }
    
    if (method !== 'GET' && Object.keys(params).length > 0) {
      code += `request['Content-Type'] = 'application/json'\n`;
      code += `request.body = ${JSON.stringify(params, null, 2).replace(/\n/g, '\n')}.to_json\n`;
    }
    
    code += `\nresponse = http.request(request)\nputs response.body`;
    return code;
  }

  function setupEventListeners() {
    // Server URL input
    const serverInput = $('server-input');
    serverInput.addEventListener('input', (e) => {
      serverUrl = e.target.value.trim();
      updateCodeExamples();
    });
    
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
        
        if (type === 'url') {
          textToCopy = buildLiveApiUrl();
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
    
    // Test request button
    const testBtn = $('test-request');
    testBtn.addEventListener('click', async () => {
      if (!currentEndpoint || !serverUrl) return;
      
      try {
        testBtn.textContent = 'Sending...';
        testBtn.disabled = true;
        
        // This is a mock implementation - in real usage you'd make an actual API call
        setTimeout(() => {
          testBtn.textContent = 'Request Sent';
          setTimeout(() => {
            testBtn.textContent = 'Send Test Request';
            testBtn.disabled = false;
          }, 2000);
        }, 1000);
        
      } catch (error) {
        testBtn.textContent = 'Error';
        setTimeout(() => {
          testBtn.textContent = 'Send Test Request';
          testBtn.disabled = false;
        }, 2000);
      }
    });
    
    // Search functionality
    const searchInput = $('search');
    searchInput.addEventListener('input', (e) => {
      performSearch(e.target.value);
    });
    
    // Keyboard shortcut for search
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== searchInput) {
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
    
    let html = '<div class="nav-group"><div style="padding: 8px 20px; font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Search Results</div>';
    
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
        parameterValues = {};
        renderEndpoint(currentEndpoint);
        renderParameterForm(currentEndpoint);
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