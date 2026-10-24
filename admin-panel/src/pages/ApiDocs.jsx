import React, { useState, useEffect } from 'react';
import {
  Code2,
  Lock,
  Unlock,
  Play,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Shield,
  Send,
  Layers,
  Terminal,
  FileCode,
  Smartphone,
  Globe,
  Server,
  Zap,
  Upload,
  Bot,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';
import { getToken } from '../api/client';
import Loader from '../components/Loader';
import { copyToClipboard } from '../utils/clipboard';

import { API_SPEC as FALLBACK_SPEC } from '../api/apiSpec';
import SocketDocsView from '../components/SocketDocsView';
import { useBranding } from '../context/BrandingContext';

// Helper to extract image items from any response or example
function extractMediaItems(data, baseUrl = '') {
  if (!data || typeof data !== 'object') return [];
  const items = [];
  const seen = new Set();

  function scan(val, parentLabel = '') {
    if (!val) return;
    if (Array.isArray(val)) {
      val.forEach((item, index) => {
        const itemLabel = item?.name || item?.title || item?.category_name || (parentLabel ? `${parentLabel} #${index + 1}` : `Item #${index + 1}`);
        scan(item, itemLabel);
      });
      return;
    }
    if (typeof val === 'object') {
      const objName = val.name || val.title || val.category_name || parentLabel;
      for (const [k, v] of Object.entries(val)) {
        if (typeof v === 'string') {
          const isImageKey = /image_url|package_image|preview_image|preview_image_url|gif_url|img_url|avatar_url|badge_icon|banner_url|thumbnail_url|thumbnail|media_url|icon_url|cover_url|photo_url/i.test(k);
          const isImageExt = /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(v) || v.startsWith('/uploads/') || v.includes('images.unsplash.com') || v.startsWith('data:image/');
          if ((isImageKey && (v.startsWith('http') || v.startsWith('/') || v.startsWith('data:image/'))) || isImageExt) {
            const resolvedUrl = v.startsWith('/') ? `${baseUrl.replace(/\/+$/, '')}${v}` : v;
            if (!seen.has(resolvedUrl)) {
              seen.add(resolvedUrl);
              items.push({
                key: k,
                label: objName || k,
                url: resolvedUrl,
                rawUrl: v,
              });
            }
          }
        } else if (typeof v === 'object' && v !== null) {
          scan(v, objName);
        }
      }
    }
  }

  scan(data);
  return items;
}

// Error Boundary to prevent any endpoint render error from breaking or hiding the UI
class EndpointErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('Endpoint Render Error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '8px', fontSize: '0.82rem' }}>
          ⚠️ Could not display endpoint details: {this.state.error?.message || 'Rendering error'}
        </div>
      );
    }
    return this.props.children;
  }
}

// Media gallery component for visual previews in API Docs
function MediaGallery({ items, onCopy, copiedKey }) {
  if (!items || !Array.isArray(items) || items.length === 0) return null;

  return (
    <div style={{ padding: '0.85rem 1rem', background: 'rgba(15,23,42,0.7)', borderTop: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
        <ImageIcon size={15} color="#38bdf8" />
        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Visual Media & Package Image Previews ({items.length})
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '10px' }}>
        {items.map((item, idx) => {
          const copyId = `media-${item.url}-${idx}`;
          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '8px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  height: '110px',
                  width: '100%',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  background: 'radial-gradient(circle, rgba(30,41,59,1) 0%, rgba(15,23,42,1) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <img
                  src={item.url}
                  alt={item.label}
                  loading="lazy"
                  style={{
                    maxHeight: '100%',
                    maxWidth: '100%',
                    objectFit: 'contain',
                  }}
                  onError={(e) => {
                    try {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.nextSibling) {
                        e.currentTarget.nextSibling.style.display = 'flex';
                      }
                    } catch (_) {}
                  }}
                />
                <div
                  style={{
                    display: 'none',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    color: 'var(--text-dim)',
                    fontSize: '0.7rem',
                    textAlign: 'center',
                    padding: '8px',
                  }}
                >
                  <ImageIcon size={20} color="#f87171" />
                  <span>Image preview unavailable</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={item.label}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontFamily: 'monospace',
                    color: '#a855f7',
                  }}
                >
                  {item.key}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px', marginTop: 'auto', paddingTop: '4px' }}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{
                    flex: 1,
                    padding: '3px 6px',
                    fontSize: '0.68rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <ExternalLink size={11} />
                  <span>View</span>
                </a>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onCopy(item.url, copyId)}
                  style={{
                    flex: 1,
                    padding: '3px 6px',
                    fontSize: '0.68rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  {copiedKey === copyId ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                  <span>{copiedKey === copyId ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ApiDocs({ onToast }) {
  const { brandName } = useBranding();
  const [docMode, setDocMode] = useState('rest'); // 'rest' | 'socket'
  const [spec, setSpec] = useState(FALLBACK_SPEC);
  const [loading, setLoading] = useState(false);
  const [methodFilter, setMethodFilter] = useState('all');
  const [liveTypeFilter, setLiveTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEndpoints, setExpandedEndpoints] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});

  // Base URL state
  const defaultBaseUrl = window.location.origin.includes(':3000')
    ? window.location.origin.replace(':3000', ':5050')
    : window.location.origin;
  const [baseUrl, setBaseUrl] = useState(defaultBaseUrl);

  // Global Auth Bearer Token state
  const [authToken, setAuthToken] = useState(getToken() || '');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [tempAuthToken, setTempAuthToken] = useState(getToken() || '');

  // Sub-tabs for each endpoint: 'spec' | 'code' | 'try'
  const [endpointTabs, setEndpointTabs] = useState({});

  // Code generator language: 'flutter' | 'curl' | 'js'
  const [codeLanguage, setCodeLanguage] = useState('flutter');

  // Interactive Runner State per endpoint: { [id]: { body: '', params: {}, response: null, loading: false, timeMs: 0 } }
  const [runnerState, setRunnerState] = useState({});

  // Copied indicator
  const [copiedKey, setCopiedKey] = useState(null);

  // Fetch live spec from backend and merge with FALLBACK_SPEC to guarantee zero missing sections
  const fetchSpec = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${baseUrl}/api/docs/spec`);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          // Merge categories so local/new categories are never wiped out
          const remoteCatIds = new Set((data.categories || []).map((c) => c.id));
          const fallbackCats = (FALLBACK_SPEC.categories || []).filter((c) => !remoteCatIds.has(c.id));
          const mergedCategories = [...(data.categories || []), ...fallbackCats];

          // Merge endpoints so local/new endpoints are never wiped out
          const remoteEpIds = new Set((data.endpoints || []).map((e) => e.id));
          const fallbackEps = (FALLBACK_SPEC.endpoints || []).filter((e) => !remoteEpIds.has(e.id));
          const mergedEndpoints = [...(data.endpoints || []), ...fallbackEps];

          setSpec({
            ...FALLBACK_SPEC,
            ...data,
            categories: mergedCategories,
            endpoints: mergedEndpoints,
          });
        }
      }
    } catch (err) {
      // Fallback already pre-set
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpec();
  }, [baseUrl]);

  const toggleEndpointExpand = (id) => {
    setExpandedEndpoints((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleCategoryExpand = (id) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const allEp = {};
    const allCat = {};
    (spec.endpoints || []).forEach((e) => { allEp[e.id] = true; });
    (spec.categories || []).forEach((c) => { allCat[c.id] = true; });
    setExpandedEndpoints(allEp);
    setExpandedCategories(allCat);
  };

  const collapseAll = () => {
    setExpandedEndpoints({});
    setExpandedCategories({});
  };

  const setEndpointSubTab = (id, tab) => {
    setEndpointTabs((prev) => ({
      ...prev,
      [id]: tab,
    }));
  };

  const handleCopy = async (text, key) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
      if (onToast) onToast('Copied to clipboard!', 'success');
    } else if (onToast) {
      onToast('Failed to copy to clipboard', 'error');
    }
  };

  const getRunnerData = (ep) => {
    if (runnerState[ep.id]) return runnerState[ep.id];
    return {
      body: ep.requestBody ? JSON.stringify(ep.requestBody.example, null, 2) : '',
      params: {},
      response: null,
      loading: false,
      timeMs: 0,
      status: null,
    };
  };

  const updateRunnerBody = (epId, newBody) => {
    setRunnerState((prev) => ({
      ...prev,
      [epId]: {
        ...(prev[epId] || {}),
        body: newBody,
      },
    }));
  };

  const executeLiveRequest = async (ep) => {
    const rData = getRunnerData(ep);
    let url = `${baseUrl}${ep.path}`;

    // Replace or append query params if applicable
    const headers = {
      'Content-Type': 'application/json',
    };

    if (ep.requiresAuth && authToken) {
      headers['Authorization'] = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
    }

    const options = {
      method: ep.method,
      headers,
    };

    if (['POST', 'PUT', 'PATCH'].includes(ep.method)) {
      const isMultipart = ep.requestBody?.type?.includes('multipart') || ep.requestBody?.fields?.some((f) => f.type.includes('file'));
      if (rData.file || isMultipart) {
        const formData = new FormData();
        if (rData.file) {
          formData.append('avatar', rData.file);
        }
        if (rData.body) {
          try {
            const parsed = JSON.parse(rData.body);
            for (const [k, v] of Object.entries(parsed)) {
              if (k !== 'avatar' && v !== undefined && v !== null) {
                formData.append(k, typeof v === 'object' ? JSON.stringify(v) : v);
              }
            }
          } catch (e) {
            // body might be form string or empty
          }
        }
        delete headers['Content-Type'];
        options.body = formData;
      } else if (rData.body) {
        try {
          // Validate JSON
          JSON.parse(rData.body);
          options.body = rData.body;
        } catch (err) {
          if (onToast) onToast('Invalid JSON in Request Body.', 'error');
          return;
        }
      }
    }

    setRunnerState((prev) => ({
      ...prev,
      [ep.id]: {
        ...(prev[ep.id] || rData),
        loading: true,
        response: null,
      },
    }));

    const startTime = performance.now();

    try {
      const res = await fetch(url, options);
      const timeMs = Math.round(performance.now() - startTime);
      let data;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      setRunnerState((prev) => ({
        ...prev,
        [ep.id]: {
          ...(prev[ep.id] || rData),
          loading: false,
          status: res.status,
          statusText: res.statusText,
          timeMs,
          response: data,
        },
      }));
    } catch (err) {
      const timeMs = Math.round(performance.now() - startTime);
      setRunnerState((prev) => ({
        ...prev,
        [ep.id]: {
          ...(prev[ep.id] || rData),
          loading: false,
          status: 0,
          statusText: 'Network / CORS Error',
          timeMs,
          response: { error: err.message },
        },
      }));
      if (onToast) onToast(err.message, 'error');
    }
  };

  // Filter endpoints by search + method + live stream type (category grouping handled in render)
  const getFilteredEndpointsForCategory = (catId) => {
    return (spec.endpoints || []).filter((ep) => {
      if (ep.category !== catId) return false;
      if (methodFilter !== 'all' && ep.method !== methodFilter) return false;
      if (liveTypeFilter !== 'all') {
        const epType = (ep.liveType || ep.live_type || '').toLowerCase();
        if (liveTypeFilter === 'audio' && epType !== 'audio' && epType !== 'both') return false;
        if (liveTypeFilter === 'video' && epType !== 'video' && epType !== 'both') return false;
        if (liveTypeFilter === 'both' && epType !== 'both') return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          ep.path.toLowerCase().includes(q) ||
          ep.summary.toLowerCase().includes(q) ||
          ep.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  };

  // Categories that have at least one matching endpoint
  const visibleCategories = (spec.categories || []).filter(
    (cat) => getFilteredEndpointsForCategory(cat.id).length > 0
  );

  const totalVisible = visibleCategories.reduce(
    (sum, cat) => sum + getFilteredEndpointsForCategory(cat.id).length,
    0
  );

  // Color helpers
  const getMethodBadgeStyle = (method) => {
    switch (method) {
      case 'GET':
        return { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: 'rgba(59, 130, 246, 0.4)' };
      case 'POST':
        return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'rgba(16, 185, 129, 0.4)' };
      case 'PUT':
      case 'PATCH':
        return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.4)' };
      case 'DELETE':
        return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.4)' };
      default:
        return { bg: 'rgba(124, 58, 237, 0.15)', color: '#7c3aed', border: 'rgba(124, 58, 237, 0.4)' };
    }
  };

  // Generate mobile Flutter / Dart code snippet
  const generateFlutterCode = (ep) => {
    if (ep.codeSnippets?.flutter) {
      return ep.codeSnippets.flutter;
    }
    const isAuth = ep.requiresAuth;
    const isPost = ep.method === 'POST';
    const isGet = ep.method === 'GET';
    const isMultipart = ep.requestBody?.type?.includes('multipart') || ep.requestBody?.fields?.some((f) => f.type.includes('file'));
    const bodyJson = ep.requestBody ? JSON.stringify(ep.requestBody.example, null, 2) : '';

    if (isMultipart) {
      const textFields = (ep.requestBody?.fields || []).filter((f) => !f.type.includes('file'));
      return `import 'dart:io';
import 'package:http/http.dart' as http;

/// Mobile Multipart File Upload (Direct from Device Camera / Gallery)
Future<void> ${ep.id.replace(/-/g, '_')}({File? avatarFile}) async {
  final url = Uri.parse('\$BASE_URL${ep.path}');
  final request = http.MultipartRequest('${ep.method}', url);
  ${isAuth ? "\n  request.headers['Authorization'] = 'Bearer \$token';" : ''}

  // 1. Text Form Fields
  ${textFields.map((f) => `request.fields['${f.name}'] = '${ep.requestBody?.example?.[f.name] || ''}';`).join('\n  ')}

  // 2. Attach Image File from Mobile Device
  if (avatarFile != null && await avatarFile.exists()) {
    request.files.add(
      await http.MultipartFile.fromPath(
        'avatar',
        avatarFile.path,
      ),
    );
  }

  // 3. Send Request
  final streamedResponse = await request.send();
  final response = await http.Response.fromStream(streamedResponse);

  if (response.statusCode >= 200 && response.statusCode < 300) {
    print('Success: \${response.body}');
  } else {
    print('Error: \${response.statusCode} - \${response.body}');
  }
}`;
    }

    return `import 'dart:convert';
import 'package:http/http.dart' as http;

Future<void> ${ep.id.replace(/-/g, '_')}() async {
  final url = Uri.parse('\$BASE_URL${ep.path}');
  
  final headers = <String, String>{
    'Content-Type': 'application/json',${isAuth ? "\n    'Authorization': 'Bearer \$token'," : ''}
  };
${isPost ? `
  final body = jsonEncode(${bodyJson});

  final response = await http.post(
    url,
    headers: headers,
    body: body,
  );` : isGet ? `
  final response = await http.get(
    url,
    headers: headers,
  );` : `
  final response = await http.${ep.method.toLowerCase()}(
    url,
    headers: headers,${bodyJson ? `\n    body: jsonEncode(${bodyJson}),` : ''}
  );`}

  if (response.statusCode >= 200 && response.statusCode < 300) {
    final data = jsonDecode(response.body);
    print('Success: \$data');
  } else {
    print('Error: \${response.statusCode} - \${response.body}');
  }
}`;
  };

  // Generate cURL command
  const generateCurlCode = (ep) => {
    if (ep.codeSnippets?.curl) {
      return ep.codeSnippets.curl;
    }
    const isAuth = ep.requiresAuth;
    const isMultipart = ep.requestBody?.type?.includes('multipart') || ep.requestBody?.fields?.some((f) => f.type.includes('file'));

    if (isMultipart) {
      let curl = `curl -X ${ep.method} "${baseUrl}${ep.path}"`;
      if (isAuth) {
        curl += ` \\\n  -H "Authorization: Bearer ${authToken || 'YOUR_JWT_TOKEN'}"`;
      }
      const fields = ep.requestBody?.fields || [];
      for (const f of fields) {
        if (f.type.includes('file')) {
          curl += ` \\\n  -F "${f.name}=@/path/to/my_photo.jpg;type=image/jpeg"`;
        } else {
          curl += ` \\\n  -F "${f.name}=${ep.requestBody?.example?.[f.name] || 'example'}"`;
        }
      }
      return curl;
    }

    const bodyJson = ep.requestBody ? JSON.stringify(ep.requestBody.example) : '';
    let curl = `curl -X ${ep.method} "${baseUrl}${ep.path}" \\\n  -H "Content-Type: application/json"`;
    if (isAuth) {
      curl += ` \\\n  -H "Authorization: Bearer ${authToken || 'YOUR_JWT_TOKEN'}"`;
    }
    if (bodyJson) {
      curl += ` \\\n  -d '${bodyJson}'`;
    }
    return curl;
  };

  // Generate structured prompt for AI Coding Agents (Base URL, FormData, Request, Success & Failed Responses)
  const generateAiAgentPrompt = (ep) => {
    const activeBaseUrl = baseUrl || 'http://localhost:5050';
    const fullUrl = `${activeBaseUrl}${ep.path}`;

    // Mobile Environments
    const emulatorUrl = `http://10.0.2.2:5050${ep.path}`;
    const lanUrl = `http://192.168.0.116:5050${ep.path}`;
    const localhostUrl = `http://localhost:5050${ep.path}`;

    // Detect if Multipart / FormData
    const isFormData = Boolean(
      ep.requestBody?.type?.includes('multipart') ||
      ep.requestBody?.type?.includes('form-data') ||
      ep.requestBody?.fields?.some((f) => (f.type || '').toLowerCase().includes('file')) ||
      ep.requestHeaders?.some((h) => ((h.value || h.example || '')).toLowerCase().includes('multipart/form-data'))
    );

    // Headers List
    const headersList = [];
    if (ep.requiresAuth) {
      headersList.push('- `Authorization`: `Bearer <JWT_TOKEN>` *(Required)*');
    }
    if (isFormData) {
      headersList.push('- `Content-Type`: `multipart/form-data` *(Auto-set boundary by HTTP client)*');
    } else if (['POST', 'PUT', 'PATCH'].includes(ep.method)) {
      headersList.push('- `Content-Type`: `application/json` *(Required)*');
    }
    if (ep.requestHeaders && ep.requestHeaders.length > 0) {
      ep.requestHeaders.forEach((h) => {
        const nameLower = (h.name || '').toLowerCase();
        if (nameLower !== 'authorization' && nameLower !== 'content-type') {
          headersList.push(`- \`${h.name}\`: \`${h.value || h.example || ''}\` *(${h.required ? 'Required' : 'Optional'})*${h.description ? ` - ${h.description}` : ''}`);
        }
      });
    }

    // Parameters (Path / Query)
    const paramsLines = [];
    if (ep.parameters && ep.parameters.length > 0) {
      ep.parameters.forEach((p) => {
        paramsLines.push(`- \`${p.name}\` (${p.in}, \`${p.type || 'string'}\`, ${p.required ? '**Required**' : 'Optional'}): ${p.description || 'No description'}`);
      });
    }

    // Body Fields / FormData Fields
    let bodyTypeDisplay = 'None (No request body)';
    if (isFormData) {
      bodyTypeDisplay = 'multipart/form-data (Multipart FormData File Upload)';
    } else if (ep.requestBody) {
      bodyTypeDisplay = ep.requestBody.type || 'application/json';
    }

    const fieldsLines = [];
    if (ep.requestBody?.fields && ep.requestBody.fields.length > 0) {
      ep.requestBody.fields.forEach((f) => {
        fieldsLines.push(`- \`${f.name}\` (\`${f.type || 'string'}\`, ${f.required ? '**Required**' : 'Optional'}): ${f.description || ''}`);
      });
    } else if (ep.requestBody?.properties) {
      Object.entries(ep.requestBody.properties).forEach(([key, val]) => {
        fieldsLines.push(`- \`${key}\` (\`${val.type || 'any'}\`, ${val.required ? '**Required**' : 'Optional'}): ${val.description || ''}`);
      });
    }

    // Example Request Body / FormData construction
    let requestExampleDisplay = '';
    if (isFormData) {
      const textFields = (ep.requestBody?.fields || []).filter((f) => !(f.type || '').includes('file'));
      const fileFields = (ep.requestBody?.fields || []).filter((f) => (f.type || '').includes('file'));

      const snippetLines = [
        '// Flutter / Dart Multipart FormData Construction:',
        `final request = http.MultipartRequest('${ep.method}', Uri.parse('$BASE_URL${ep.path}'));`,
        ep.requiresAuth ? "request.headers['Authorization'] = 'Bearer $userToken';" : null,
      ].filter(Boolean);

      if (textFields.length > 0) {
        snippetLines.push('// Form text fields:');
        textFields.forEach((f) => {
          const val = ep.requestBody?.example?.[f.name] !== undefined ? ep.requestBody.example[f.name] : 'sample_value';
          snippetLines.push(`request.fields['${f.name}'] = '${val}';`);
        });
      }

      snippetLines.push('// Attached Media / File fields:');
      if (fileFields.length > 0) {
        fileFields.forEach((f) => {
          snippetLines.push(`request.files.add(await http.MultipartFile.fromPath('${f.name}', selectedFile.path));`);
        });
      } else {
        snippetLines.push(`request.files.add(await http.MultipartFile.fromPath('file', selectedFile.path));`);
      }

      requestExampleDisplay = snippetLines.join('\n');
    } else if (ep.requestBody?.example) {
      requestExampleDisplay = typeof ep.requestBody.example === 'string'
        ? ep.requestBody.example
        : JSON.stringify(ep.requestBody.example, null, 2);
    }

    // Responses separation
    const responses = ep.responses || [];
    const successList = responses.filter((r) => r.status >= 200 && r.status < 300);
    const existingFailedList = responses.filter((r) => r.status >= 400);

    // Build unified failed responses list
    const combinedFailedList = [...existingFailedList];
    const hasStatus = (s) => combinedFailedList.some((r) => r.status === s);

    if (!hasStatus(400)) {
      combinedFailedList.push({
        status: 400,
        description: 'Bad Request - Validation failed or missing parameters',
        example: {
          success: false,
          message: 'Invalid request data or missing required fields.',
          error: 'BAD_REQUEST',
        },
      });
    }

    if (ep.requiresAuth && !hasStatus(401)) {
      combinedFailedList.push({
        status: 401,
        description: 'Unauthorized - Missing or invalid Bearer JWT Token',
        example: {
          success: false,
          message: 'Access denied. Valid Bearer token required.',
          error: 'UNAUTHORIZED',
        },
      });
    }

    if (!hasStatus(500)) {
      combinedFailedList.push({
        status: 500,
        description: 'Internal Server Error - Server-side exception',
        example: {
          success: false,
          message: 'An internal server error occurred while processing the request.',
          error: 'INTERNAL_SERVER_ERROR',
        },
      });
    }

    // Format Success responses
    const successMarkdown = successList.length > 0
      ? successList.map((r) => `#### HTTP ${r.status} (${r.description || 'Success'})\n\`\`\`json\n${JSON.stringify(r.example, null, 2)}\n\`\`\``).join('\n\n')
      : `#### HTTP 200 (Success)\n\`\`\`json\n{\n  "success": true,\n  "message": "Operation completed successfully."\n}\n\`\`\``;

    // Format Failed responses
    const failedMarkdown = combinedFailedList
      .sort((a, b) => a.status - b.status)
      .map((r) => `#### HTTP ${r.status} (${r.description || 'Error'})\n\`\`\`json\n${JSON.stringify(r.example, null, 2)}\n\`\`\``)
      .join('\n\n');

    return `# API Integration Specification for AI Agent

## 1. Endpoint Overview
- **Summary**: ${ep.summary}
- **Description**: ${ep.description}
- **Live Stream Target**: ${ep.liveType === 'audio' ? '🎙️ Audio Live Only' : ep.liveType === 'video' ? '🎥 Video Live Only' : ep.liveType === 'both' ? '🎥🎙️ Both Video & Audio Live' : 'General Platform API'}
- **HTTP Method**: \`${ep.method}\`
- **Route / Path**: \`${ep.path}\`
- **Authentication**: ${ep.requiresAuth ? '🔒 Required (`Authorization: Bearer <JWT_TOKEN>`)' : '🌐 Public (No authentication token needed)'}

## 2. Base URLs & Mobile Endpoints
- **Active Base URL**: \`${activeBaseUrl}\`
- **Full Endpoint URL**: \`${fullUrl}\`
- **Mobile Environment URLs (Flutter / Dart)**:
  - **Android Emulator**: \`${emulatorUrl}\`
  - **Real Device (LAN Wi-Fi)**: \`${lanUrl}\`
  - **iOS Simulator / Web**: \`${localhostUrl}\`

## 3. Request Specifications
### Headers:
${headersList.join('\n')}

### Path / Query Parameters:
${paramsLines.length > 0 ? paramsLines.join('\n') : '- None'}

### Request Body & Form Data:
- **Type**: \`${bodyTypeDisplay}\`
${fieldsLines.length > 0 ? `\n- **Fields / Schema**:\n${fieldsLines.join('\n')}\n` : ''}
${requestExampleDisplay ? `\n### Request Payload / FormData Example:\n\`\`\`${isFormData ? 'dart' : 'json'}\n${requestExampleDisplay}\n\`\`\`` : ''}

## 4. Response Specifications
### ✅ Success Response:
${successMarkdown}

### ❌ Failed / Error Responses:
${failedMarkdown}

## 5. Directives for AI Coding Agent
Please implement the client-side integration (Flutter / Dart) for this endpoint:
1. Define model classes with \`fromJson\` and \`toJson\` mapping the Success Response.
2. Implement the API service/repository method for \`${ep.method} ${ep.path}\`.
${isFormData ? '3. Handle multipart file upload via `http.MultipartRequest` with the form fields above.' : '3. Send JSON body with `Content-Type: application/json`.'}
${ep.requiresAuth ? '4. Include the Bearer token in the `Authorization` header.' : ''}
5. On HTTP error status (4xx/5xx), catch and extract the \`message\` from the error response JSON to display to the user.`;
  };

  return (
    <div className="page-container" style={{ paddingBottom: '4rem' }}>
      {/* Top Banner / Hero Header */}
      <div className="panel-card" style={{ padding: '1.75rem', borderRadius: '18px', marginBottom: '1.75rem', borderLeft: '5px solid #7c3aed' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(124, 58, 237, 0.15)', color: '#7c3aed' }}>
                <Terminal size={24} />
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
                {spec.title || `${brandName} REST API Explorer`}
              </h1>
              <span className="badge badge-primary" style={{ fontSize: '0.72rem', fontWeight: 800 }}>
                {spec.version || 'v1.0.0'}
              </span>
            </div>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-dim)', margin: 0, maxWidth: '750px' }}>
              Interactive Swagger-compatible documentation for mobile application engineers (Flutter / iOS / Android) {'&'} web developers. 
              Inspect JSON schemas, copy mobile client snippets, and test real endpoints directly in your browser.
            </p>
          </div>

          {/* Quick Actions (Base URL & Authorize) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Base URL selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-primary)', padding: '6px 10px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <Server size={14} color="#7c3aed" />
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-main)',
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  width: '180px',
                  outline: 'none',
                }}
                title="API Base URL (Host & Port)"
              />
            </div>

            {/* Authorize Button */}
            <button
              type="button"
              className={`btn btn-sm ${authToken ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setAuthModalOpen(true)}
              style={{
                borderRadius: '10px',
                padding: '0.5rem 1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 700,
              }}
            >
              {authToken ? <Lock size={15} color="#10b981" /> : <Unlock size={15} />}
              <span>{authToken ? 'Authorized' : 'Authorize (Bearer)'}</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={fetchSpec}
              title="Reload API Spec"
              style={{ borderRadius: '10px', padding: '0.5rem 0.75rem' }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* Main Mode Switcher: REST API Explorer vs Real-Time Socket.IO Guide */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            marginTop: '1.5rem',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '1.25rem',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => setDocMode('rest')}
            className="btn btn-sm"
            style={{
              borderRadius: '12px',
              padding: '10px 18px',
              fontSize: '0.86rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background:
                docMode === 'rest'
                  ? 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)'
                  : 'var(--bg-secondary)',
              color: docMode === 'rest' ? '#fff' : 'var(--text-main)',
              border: docMode === 'rest' ? 'none' : '1px solid var(--border-color)',
              boxShadow: docMode === 'rest' ? '0 4px 14px rgba(124, 58, 237, 0.3)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Terminal size={17} />
            <span>📚 REST API Explorer (Swagger / cURL / Flutter)</span>
            <span
              style={{
                background: docMode === 'rest' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(124, 58, 237, 0.1)',
                color: docMode === 'rest' ? '#fff' : '#7c3aed',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.72rem',
                fontWeight: 800,
              }}
            >
              {spec.endpoints?.length || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setDocMode('socket')}
            className="btn btn-sm"
            style={{
              borderRadius: '12px',
              padding: '10px 18px',
              fontSize: '0.86rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background:
                docMode === 'socket'
                  ? 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)'
                  : 'var(--bg-secondary)',
              color: docMode === 'socket' ? '#fff' : 'var(--text-main)',
              border: docMode === 'socket' ? 'none' : '1px solid var(--border-color)',
              boxShadow: docMode === 'socket' ? '0 4px 14px rgba(2, 132, 199, 0.3)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Zap size={17} />
            <span>⚡ Real-Time Socket.IO & Mobile Guide (Seats, Rooms, Admins)</span>
            <span
              style={{
                background: docMode === 'socket' ? 'rgba(255, 255, 255, 0.25)' : '#10b981',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.7rem',
                fontWeight: 800,
                letterSpacing: '0.5px',
              }}
            >
              REAL-TIME
            </span>
          </button>
        </div>
      </div>

      {docMode === 'socket' ? (
        <SocketDocsView baseUrl={baseUrl} onToast={onToast} />
      ) : (
        <>
        {/* Search & Method Filter */}
      <div className="panel-card" style={{ padding: '1.25rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Search box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search by path, summary, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem', borderRadius: '10px' }}
            />
          </div>

          {/* Method filter */}
          <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-primary)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
            {['all', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => {
              const active = methodFilter === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethodFilter(m)}
                  className="btn btn-sm"
                  style={{
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    background: active ? 'var(--primary-color)' : 'transparent',
                    color: active ? '#fff' : 'var(--text-dim)',
                    border: 'none',
                  }}
                >
                  {m.toUpperCase()}
                </button>
              );
            })}
          </div>

          {/* Live Stream Type Filter (All, Audio, Video, Both) */}
          <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-primary)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Streams' },
              { id: 'audio', label: '🎙️ Audio Live' },
              { id: 'video', label: '🎥 Video Live' },
              { id: 'both', label: '🎥🎙️ Video & Audio' },
            ].map((t) => {
              const active = liveTypeFilter === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setLiveTypeFilter(t.id)}
                  className="btn btn-sm"
                  style={{
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    background: active
                      ? (t.id === 'audio' ? '#8b5cf6' : t.id === 'video' ? '#ec4899' : t.id === 'both' ? '#3b82f6' : 'var(--primary-color)')
                      : 'transparent',
                    color: active ? '#fff' : 'var(--text-dim)',
                    border: 'none',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Header & Bulk Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', padding: '0 4px' }}>
        <span style={{ fontSize: '0.84rem', color: 'var(--text-dim)', fontWeight: 600 }}>
          Showing <strong>{totalVisible}</strong> endpoints across <strong>{visibleCategories.length}</strong> categories
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={expandAll}
            style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '8px' }}
          >
            Expand All
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={collapseAll}
            style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '8px' }}
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* ===== NESTED ACCORDION: Category > Endpoints ===== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {visibleCategories.length === 0 ? (
          <div className="panel-card" style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-dim)', borderRadius: '16px' }}>
            <FileCode size={44} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>No Matching Endpoints Found</div>
            <p style={{ fontSize: '0.84rem', marginTop: '4px' }}>Try adjusting your search query or method filter.</p>
          </div>
        ) : (
          visibleCategories.map((cat) => {
            const catEndpoints = getFilteredEndpointsForCategory(cat.id);
            const isCatOpen = Boolean(expandedCategories[cat.id]);

            return (
              <div
                key={cat.id}
                className="panel-card"
                style={{
                  padding: 0,
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: isCatOpen ? '1px solid rgba(124, 58, 237, 0.35)' : '1px solid var(--border-color)',
                  transition: 'border-color 0.2s ease',
                }}
              >
                {/* ── Category Header (Top-level Accordion Toggle) ── */}
                <div
                  onClick={() => toggleCategoryExpand(cat.id)}
                  style={{
                    padding: '1rem 1.4rem',
                    background: isCatOpen
                      ? 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(79,70,229,0.08) 100%)'
                      : 'var(--bg-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                    gap: '12px',
                    borderBottom: isCatOpen ? '1px solid var(--border-color)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '10px',
                      background: isCatOpen ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.95rem',
                      fontWeight: 900,
                      color: isCatOpen ? '#a78bfa' : '#7c3aed',
                      flexShrink: 0,
                      fontFamily: 'monospace',
                      letterSpacing: '-0.5px',
                    }}>
                      M
                    </div>
                    <div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
                        {cat.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        {cat.description}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '20px',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      background: isCatOpen ? 'rgba(124,58,237,0.18)' : 'var(--bg-primary)',
                      color: isCatOpen ? '#a78bfa' : 'var(--text-dim)',
                      border: '1px solid var(--border-color)',
                    }}>
                      {catEndpoints.length} endpoint{catEndpoints.length !== 1 ? 's' : ''}
                    </span>
                    {isCatOpen
                      ? <ChevronUp size={18} color="#7c3aed" />
                      : <ChevronDown size={18} color="var(--text-dim)" />}
                  </div>
                </div>

                {/* ── Endpoints Sub-Accordion List ── */}
                {isCatOpen && (
                  <div style={{ background: 'var(--bg-primary)', padding: '0.75rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {catEndpoints.map((ep) => {
                        const isExpanded = Boolean(expandedEndpoints[ep.id]);
                        const badgeStyle = getMethodBadgeStyle(ep.method);
                        const currentSubTab = endpointTabs[ep.id] || 'spec';
                        const runner = getRunnerData(ep);

                        return (
                          <div
                            key={ep.id}
                            style={{
                              borderRadius: '12px',
                              border: `1px solid ${isExpanded ? badgeStyle.border : 'var(--border-color)'}`,
                              overflow: 'hidden',
                              background: 'var(--bg-card)',
                              transition: 'border-color 0.15s ease',
                            }}
                          >
                            {/* Sub-accordion header */}
                            <div
                              onClick={() => toggleEndpointExpand(ep.id)}
                              style={{
                                padding: '0.75rem 1rem',
                                background: isExpanded ? badgeStyle.bg : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                userSelect: 'none',
                                gap: '10px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', minWidth: 0 }}>
                                {/* Method Badge */}
                                <span
                                  style={{
                                    padding: '3px 9px',
                                    borderRadius: '6px',
                                    fontSize: '0.74rem',
                                    fontWeight: 900,
                                    fontFamily: 'monospace',
                                    background: badgeStyle.bg,
                                    color: badgeStyle.color,
                                    border: `1px solid ${badgeStyle.border}`,
                                    minWidth: '58px',
                                    textAlign: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  {ep.method}
                                </span>

                                {/* Live Stream Type Badge */}
                                {ep.liveType === 'audio' && (
                                  <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.35)', display: 'inline-flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                                    🎙️ Audio Live
                                  </span>
                                )}
                                {ep.liveType === 'video' && (
                                  <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6', border: '1px solid rgba(236, 72, 153, 0.35)', display: 'inline-flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                                    🎥 Video Live
                                  </span>
                                )}
                                {ep.liveType === 'both' && (
                                  <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.35)', display: 'inline-flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                                    🎥🎙️ Video & Audio
                                  </span>
                                )}

                                {/* Path */}
                                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)', wordBreak: 'break-all' }}>
                                  {ep.path}
                                </span>

                                {/* Summary */}
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 500 }}>
                                  — {ep.summary}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  title="Copy complete API specification & prompt for AI Coding Agent"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const promptText = generateAiAgentPrompt(ep);
                                    handleCopy(promptText, `ai-header-${ep.id}`);
                                  }}
                                  style={{
                                    padding: '3px 9px',
                                    borderRadius: '6px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    background: copiedKey === `ai-header-${ep.id}` ? 'rgba(16, 185, 129, 0.2)' : 'rgba(124, 58, 237, 0.15)',
                                    color: copiedKey === `ai-header-${ep.id}` ? '#10b981' : '#a855f7',
                                    border: `1px solid ${copiedKey === `ai-header-${ep.id}` ? 'rgba(16, 185, 129, 0.4)' : 'rgba(124, 58, 237, 0.35)'}`,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                >
                                  {copiedKey === `ai-header-${ep.id}` ? (
                                    <>
                                      <Check size={12} color="#10b981" />
                                      <span>Copied for AI!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Bot size={12} />
                                      <span>Copy for AI</span>
                                    </>
                                  )}
                                </button>

                                {ep.requiresAuth ? (
                                  <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 7px', borderRadius: '5px', background: 'rgba(239,68,68,0.12)', color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                    <Lock size={11} /> Auth
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 7px', borderRadius: '5px', background: 'rgba(16,185,129,0.12)', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                    <Unlock size={11} /> Public
                                  </span>
                                )}
                                {isExpanded ? <ChevronUp size={16} color={badgeStyle.color} /> : <ChevronDown size={16} color="var(--text-dim)" />}
                              </div>
                            </div>

                            {/* Expanded Endpoint Body */}
                            {isExpanded && (
                              <EndpointErrorBoundary>
                                <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                                {/* Description */}
                                <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: '0 0 1rem' }}>
                                  {ep.description}
                                </p>

                                {/* Sub-navigation Tabs */}
                                <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                  <button
                                    type="button"
                                    className={`btn btn-sm ${currentSubTab === 'spec' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setEndpointSubTab(ep.id, 'spec')}
                                    style={{ borderRadius: '8px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                  >
                                    <Layers size={14} />
                                    <span>Parameters & Schemas</span>
                                  </button>

                                  <button
                                    type="button"
                                    className={`btn btn-sm ${currentSubTab === 'code' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setEndpointSubTab(ep.id, 'code')}
                                    style={{ borderRadius: '8px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                  >
                                    <Smartphone size={14} />
                                    <span>Mobile Code (Flutter / cURL)</span>
                                  </button>

                                  <button
                                    type="button"
                                    className={`btn btn-sm ${currentSubTab === 'try' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setEndpointSubTab(ep.id, 'try')}
                                    style={{ borderRadius: '8px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px', background: currentSubTab === 'try' ? '#10b981' : undefined }}
                                  >
                                    <Play size={14} />
                                    <span>Try It Out (Live Sandbox)</span>
                                  </button>

                                  <button
                                    type="button"
                                    className={`btn btn-sm ${currentSubTab === 'ai' ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setEndpointSubTab(ep.id, 'ai')}
                                    style={{
                                      borderRadius: '8px',
                                      fontSize: '0.78rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      background: currentSubTab === 'ai' ? '#7c3aed' : undefined,
                                      borderColor: currentSubTab === 'ai' ? '#7c3aed' : undefined,
                                    }}
                                  >
                                    <Bot size={14} />
                                    <span>AI Agent Prompt</span>
                                  </button>

                                  <div style={{ marginLeft: 'auto' }}>
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => {
                                        const promptText = generateAiAgentPrompt(ep);
                                        handleCopy(promptText, `ai-tab-${ep.id}`);
                                      }}
                                      style={{
                                        borderRadius: '8px',
                                        fontSize: '0.75rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        color: copiedKey === `ai-tab-${ep.id}` ? '#10b981' : '#a855f7',
                                        borderColor: copiedKey === `ai-tab-${ep.id}` ? '#10b981' : 'rgba(124, 58, 237, 0.4)',
                                      }}
                                    >
                                      {copiedKey === `ai-tab-${ep.id}` ? <Check size={13} color="#10b981" /> : <Bot size={13} />}
                                      <span>{copiedKey === `ai-tab-${ep.id}` ? 'Copied Prompt!' : 'Copy for AI Agent'}</span>
                                    </button>
                                  </div>
                                </div>

                                {/* SUB-TAB 1: SPECIFICATION & SCHEMAS */}
                                {currentSubTab === 'spec' && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    {ep.requestHeaders?.length > 0 && (
                                      <div>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>REQUEST HEADERS</div>
                                        <div className="table-responsive" style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                          <table className="data-table" style={{ margin: 0, fontSize: '0.82rem' }}>
                                            <thead><tr><th>Header</th><th>Value</th><th>Required</th><th>Description</th></tr></thead>
                                            <tbody>
                                              {ep.requestHeaders.map((h, i) => (
                                                <tr key={i}>
                                                  <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{h.name}</td>
                                                  <td style={{ fontFamily: 'monospace', color: '#7c3aed' }}>{h.value}</td>
                                                  <td>{h.required ? <span className="badge badge-danger">Required</span> : <span className="badge badge-secondary">Optional</span>}</td>
                                                  <td style={{ color: 'var(--text-dim)' }}>{h.description || '-'}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}

                                    {ep.requestBody && (
                                      <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)' }}>REQUEST BODY PAYLOAD ({ep.requestBody.type})</div>
                                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleCopy(JSON.stringify(ep.requestBody.example, null, 2), `req-${ep.id}`)} style={{ padding: '3px 8px', fontSize: '0.72rem' }}>
                                            {copiedKey === `req-${ep.id}` ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                                            <span>Copy JSON</span>
                                          </button>
                                        </div>
                                        {ep.requestBody.fields?.length > 0 && (
                                          <div className="table-responsive" style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '8px' }}>
                                            <table className="data-table" style={{ margin: 0, fontSize: '0.82rem' }}>
                                              <thead><tr><th>Field Name</th><th>Data Type</th><th>Required</th><th>Description</th></tr></thead>
                                              <tbody>
                                                {ep.requestBody.fields.map((f, i) => (
                                                  <tr key={i}>
                                                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-main)' }}>{f.name}</td>
                                                    <td style={{ fontFamily: 'monospace', color: '#0284c7' }}>{f.type}</td>
                                                    <td>{f.required ? <span className="badge badge-danger">Required</span> : <span className="badge badge-secondary">Optional</span>}</td>
                                                    <td style={{ color: 'var(--text-dim)' }}>{f.description}</td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        )}
                                        <pre style={{ background: 'rgba(15,23,42,0.95)', padding: '1rem', borderRadius: '10px', color: '#38bdf8', fontSize: '0.8rem', fontFamily: 'monospace', margin: 0, overflowX: 'auto', border: '1px solid var(--border-color)' }}>
                                          {JSON.stringify(ep.requestBody.example, null, 2)}
                                        </pre>
                                      </div>
                                    )}

                                    <div>
                                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>RESPONSES & HTTP STATUS CODES</div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {ep.responses?.map((resp, i) => {
                                          const isSuccess = resp.status >= 200 && resp.status < 300;
                                          return (
                                            <div key={i} style={{ border: '1px solid var(--border-color)', borderRadius: '10px', background: 'var(--bg-card)', overflow: 'hidden' }}>
                                              <div style={{ padding: '8px 12px', background: isSuccess ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                  <span className={`badge ${isSuccess ? 'badge-success' : 'badge-danger'}`} style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.74rem' }}>{resp.status}</span>
                                                  <span style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 600 }}>{resp.description}</span>
                                                </div>
                                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleCopy(JSON.stringify(resp.example, null, 2), `resp-${ep.id}-${resp.status}`)} style={{ padding: '2px 7px', fontSize: '0.7rem' }}>
                                                  {copiedKey === `resp-${ep.id}-${resp.status}` ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                                                  <span>Copy</span>
                                                </button>
                                              </div>
                                              <pre style={{ background: 'rgba(15,23,42,0.95)', padding: '0.85rem 1rem', margin: 0, color: isSuccess ? '#4ade80' : '#f87171', fontSize: '0.78rem', fontFamily: 'monospace', overflowX: 'auto' }}>
                                                {JSON.stringify(resp.example, null, 2)}
                                              </pre>
                                              <MediaGallery items={extractMediaItems(resp.example, baseUrl)} onCopy={handleCopy} copiedKey={copiedKey} />
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* SUB-TAB 2: MOBILE CODE GENERATOR */}
                                {currentSubTab === 'code' && (
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                      <div style={{ display: 'flex', gap: '6px' }}>
                                        <button type="button" className={`btn btn-sm ${codeLanguage === 'flutter' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setCodeLanguage('flutter')} style={{ borderRadius: '6px', fontSize: '0.76rem', fontWeight: 700 }}>Flutter / Dart (http)</button>
                                        <button type="button" className={`btn btn-sm ${codeLanguage === 'curl' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setCodeLanguage('curl')} style={{ borderRadius: '6px', fontSize: '0.76rem', fontWeight: 700 }}>cURL Command</button>
                                      </div>
                                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => { const code = codeLanguage === 'flutter' ? generateFlutterCode(ep) : generateCurlCode(ep); handleCopy(code, `code-${ep.id}-${codeLanguage}`); }} style={{ padding: '4px 10px', fontSize: '0.74rem' }}>
                                        {copiedKey === `code-${ep.id}-${codeLanguage}` ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                                        <span>Copy Code Snippet</span>
                                      </button>
                                    </div>
                                    <pre style={{ background: 'rgba(15,23,42,0.98)', padding: '1.15rem', borderRadius: '12px', color: '#e2e8f0', fontSize: '0.8rem', fontFamily: 'monospace', margin: 0, overflowX: 'auto', lineHeight: 1.5, border: '1px solid var(--border-color)' }}>
                                      {codeLanguage === 'flutter' ? generateFlutterCode(ep) : generateCurlCode(ep)}
                                    </pre>
                                  </div>
                                )}

                                {/* SUB-TAB 3: INTERACTIVE SANDBOX */}
                                {currentSubTab === 'try' && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ background: 'var(--bg-card)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)' }}>REQUEST PAYLOAD / BODY</div>
                                        {ep.requestBody && (
                                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => updateRunnerBody(ep.id, JSON.stringify(ep.requestBody.example, null, 2))} style={{ padding: '2px 7px', fontSize: '0.7rem' }}>Reset to Default</button>
                                        )}
                                      </div>

                                      {(ep.requestBody?.type?.includes('multipart') || ep.requestBody?.fields?.some((f) => f.type.includes('file'))) && (
                                        <div style={{ marginBottom: '12px', padding: '10px 14px', background: 'rgba(56,189,248,0.08)', borderRadius: '8px', border: '1px dashed rgba(56,189,248,0.35)' }}>
                                          <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', cursor: 'pointer' }}>
                                            <Upload size={14} /><span>Attach Avatar Image File:</span>
                                          </label>
                                          <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0] || null; setRunnerState((prev) => ({ ...prev, [ep.id]: { ...(prev[ep.id] || runner), file } })); }} style={{ fontSize: '0.8rem', color: 'var(--text-main)', width: '100%' }} />
                                          {runner.file && <div style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 700, marginTop: '5px' }}>✓ Selected: {runner.file.name} ({(runner.file.size / 1024).toFixed(1)} KB)</div>}
                                        </div>
                                      )}

                                      {['POST', 'PUT', 'PATCH'].includes(ep.method) ? (
                                        <textarea rows={7} value={runner.body} onChange={(e) => updateRunnerBody(ep.id, e.target.value)} className="input-field" style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.8rem', background: 'rgba(15,23,42,0.9)', color: '#38bdf8', borderRadius: '8px', padding: '0.75rem' }} placeholder="Enter JSON request body..." />
                                      ) : (
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontStyle: 'italic', padding: '0.5rem 0' }}>This endpoint is {ep.method} and does not require a request body.</div>
                                      )}

                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                                        <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>Target: <strong style={{ color: 'var(--text-main)', fontFamily: 'monospace' }}>{baseUrl}{ep.path}</strong></div>
                                        <button type="button" className="btn btn-primary btn-sm" disabled={runner.loading} onClick={() => executeLiveRequest(ep)} style={{ borderRadius: '8px', padding: '0.5rem 1.25rem', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}>
                                          {runner.loading ? <Loader inline /> : <Send size={14} />}
                                          <span>{runner.loading ? 'Executing...' : 'Send Live Request'}</span>
                                        </button>
                                      </div>
                                    </div>

                                    {runner.response !== null && (
                                      <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                                        <div style={{ padding: '8px 14px', background: runner.status >= 200 && runner.status < 300 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span className={`badge ${runner.status >= 200 && runner.status < 300 ? 'badge-success' : 'badge-danger'}`} style={{ fontFamily: 'monospace', fontWeight: 800 }}>{runner.status} {runner.statusText}</span>
                                            <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>Latency: <strong style={{ color: 'var(--text-main)' }}>{runner.timeMs} ms</strong></span>
                                          </div>
                                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleCopy(typeof runner.response === 'object' ? JSON.stringify(runner.response, null, 2) : String(runner.response), `run-${ep.id}`)} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                                            {copiedKey === `run-${ep.id}` ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                                            <span>Copy Response</span>
                                          </button>
                                        </div>
                                        <pre style={{ background: 'rgba(15,23,42,0.98)', padding: '1rem', margin: 0, color: runner.status >= 200 && runner.status < 300 ? '#4ade80' : '#f87171', fontSize: '0.8rem', fontFamily: 'monospace', maxHeight: '350px', overflowY: 'auto' }}>
                                          {typeof runner.response === 'object' ? JSON.stringify(runner.response, null, 2) : String(runner.response)}
                                        </pre>
                                        {typeof runner.response === 'object' && (
                                          <MediaGallery items={extractMediaItems(runner.response, baseUrl)} onCopy={handleCopy} copiedKey={copiedKey} />
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* SUB-TAB 4: AI AGENT PROMPT */}
                                {currentSubTab === 'ai' && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: '10px',
                                        padding: '0.85rem 1rem',
                                        background: 'rgba(124, 58, 237, 0.08)',
                                        border: '1px solid rgba(124, 58, 237, 0.25)',
                                        borderRadius: '10px',
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '240px' }}>
                                        <Sparkles size={16} color="#a855f7" />
                                        <span style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontWeight: 600 }}>
                                          Structured specification with Base URL, Request, Form-Data (if applicable), Success & Error responses for AI Agents (Antigravity, Cursor, Claude, ChatGPT).
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        onClick={() => {
                                          const promptText = generateAiAgentPrompt(ep);
                                          handleCopy(promptText, `ai-preview-${ep.id}`);
                                        }}
                                        style={{
                                          borderRadius: '8px',
                                          fontSize: '0.78rem',
                                          fontWeight: 800,
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          background: copiedKey === `ai-preview-${ep.id}` ? '#10b981' : '#7c3aed',
                                          borderColor: copiedKey === `ai-preview-${ep.id}` ? '#10b981' : '#7c3aed',
                                        }}
                                      >
                                        {copiedKey === `ai-preview-${ep.id}` ? <Check size={13} /> : <Copy size={13} />}
                                        <span>{copiedKey === `ai-preview-${ep.id}` ? 'Copied Prompt to Clipboard!' : 'Copy Full AI Prompt'}</span>
                                      </button>
                                    </div>

                                    <pre
                                      style={{
                                        background: 'rgba(15,23,42,0.98)',
                                        padding: '1.25rem',
                                        borderRadius: '12px',
                                        color: '#e2e8f0',
                                        fontSize: '0.8rem',
                                        fontFamily: 'monospace',
                                        margin: 0,
                                        overflowX: 'auto',
                                        lineHeight: 1.55,
                                        border: '1px solid var(--border-color)',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        maxHeight: '520px',
                                        overflowY: 'auto',
                                      }}
                                    >
                                      {generateAiAgentPrompt(ep)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                              </EndpointErrorBoundary>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      </>
      )}

      {/* MODAL: AUTHORIZE BEARER TOKEN */}
      {authModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(124, 58, 237, 0.15)', color: '#7c3aed' }}>
                <Shield size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  Available Authorizations
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: '2px 0 0' }}>
                  Authorize Bearer Token for protected mobile endpoints.
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '6px' }}>
                JWT Bearer Token:
              </label>
              <textarea
                rows={4}
                value={tempAuthToken}
                onChange={(e) => setTempAuthToken(e.target.value)}
                className="input-field"
                placeholder="Paste JWT token here..."
                style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const current = getToken();
                  if (current) setTempAuthToken(current);
                }}
              >
                Use Current Admin Token
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setAuthToken('');
                    setTempAuthToken('');
                    setAuthModalOpen(false);
                  }}
                >
                  Clear Auth
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setAuthToken(tempAuthToken.trim());
                    setAuthModalOpen(false);
                    if (onToast) onToast('Authorization token saved.', 'success');
                  }}
                >
                  Save & Authorize
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
