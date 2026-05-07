let SUPABASE_URL = '';
let SUPABASE_KEY = '';
const ADMIN_API = ''; // same origin — works locally and on Render
let sb = null;

let currentUser = null;

// ─── Initialize Supabase ──────────────────────────────────────────────────────
async function initSupabase() {
  try {
    const res = await fetch('/api/config');
    const config = await res.json();
    SUPABASE_URL = config.supabaseUrl;
    SUPABASE_KEY = config.supabaseKey;
    sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // Check session
    const { data } = await sb.auth.getSession();
    if (data.session) {
      currentUser = data.session.user;
    }
    updateNav();
    loadStats();
    
    // Listen to auth changes
    sb.auth.onAuthStateChange((event, session) => {
      currentUser = session?.user || null;
      updateNav();
      if (event === 'SIGNED_IN') {
        showPage('home');
      }
    });
  } catch (err) {
    console.error('Failed to initialize:', err);
  }
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function updateNav() {
  const u = currentUser;
  
  // Update header navigation
  document.getElementById('uploadNav').style.display = u ? 'inline-block' : 'none';
  document.getElementById('adminNav').style.display = (u?.user_metadata?.role === 'admin') ? 'inline-block' : 'none';
  
  // Update header sections
  document.getElementById('userSection').style.display = u ? 'flex' : 'none';
  document.getElementById('authSection').style.display = u ? 'none' : 'flex';
  
  // Update user info
  if (u) {
    document.getElementById('userName').textContent = u.user_metadata?.full_name || u.email;
  }
  
  // Update active nav link
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
}

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${name}`).classList.add('active');
  
  // Update active nav link
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
    if (link.dataset.page === name) {
      link.classList.add('active');
    }
  });
  
  if (name === 'browse') loadResources();
  if (name === 'home')   loadStats();
  if (name === 'admin')  adminTab('resources');
}

async function logout() {
  await sb.auth.signOut();
  currentUser = null;
  updateNav();
  showPage('home');
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function register() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-password').value;
  const msg   = document.getElementById('reg-msg');
  const btn   = event.target;

  if (!name || !email || !pass) return setMsg(msg, 'All fields are required.');
  
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Loading...';

  const { data, error } = await sb.auth.signUp({
    email, password: pass,
    options: { 
      data: { full_name: name },
      emailRedirectTo: window.location.origin
    }
  });
  
  btn.disabled = false;
  btn.textContent = 'Register';
  
  if (error) return setMsg(msg, error.message);
  
  // Auto-login after registration (no email verification)
  currentUser = data.user;
  updateNav();
  setMsg(msg, 'Account created! Redirecting...', true);
  setTimeout(() => showPage('home'), 1000);
}

async function login() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value;
  const msg   = document.getElementById('login-msg');
  const btn   = event.target;

  if (!email || !pass) return setMsg(msg, 'Email and password are required.');
  
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Loading...';

  const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
  
  btn.disabled = false;
  btn.textContent = 'Login';
  
  if (error) return setMsg(msg, error.message);
  currentUser = data.user;
  updateNav();
  showPage('home');
}

async function loginWithGoogle() {
  const msg = document.getElementById('login-msg');
  const btn = event.target;
  
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Loading...';
  
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  
  btn.disabled = false;
  btn.textContent = 'Continue with Google';
  
  if (error) setMsg(msg, error.message);
}

// ─── Upload ───────────────────────────────────────────────────────────────────
function toggleLinkField() {
  const type = document.getElementById('res-type').value;
  document.getElementById('file-field').style.display = type === 'link' ? 'none' : '';
  document.getElementById('link-field').style.display = type === 'link' ? '' : 'none';
}

async function uploadResource() {
  if (!currentUser) return showPage('login');
  const title   = document.getElementById('res-title').value.trim();
  const desc    = document.getElementById('res-desc').value.trim();
  const subject = document.getElementById('res-subject').value.trim();
  const type    = document.getElementById('res-type').value;
  const linkUrl = document.getElementById('res-link').value.trim();
  const file    = document.getElementById('res-file').files[0];
  const msg     = document.getElementById('upload-msg');
  const btn     = event.target;

  if (!title || !subject) return setMsg(msg, 'Title and subject are required.');

  let fileUrl = '';
  if (type !== 'link') {
    if (!file) return setMsg(msg, 'Please select a file.');
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return setMsg(msg, 'File size must be less than 5MB.');
    }
    
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Uploading...';
    
    const ext  = file.name.split('.').pop();
    const path = `resources/${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage.from('study-files').upload(path, file);
    if (upErr) {
      btn.disabled = false;
      btn.textContent = 'Upload';
      return setMsg(msg, upErr.message);
    }
    const { data: urlData } = sb.storage.from('study-files').getPublicUrl(path);
    fileUrl = urlData.publicUrl;
  } else {
    if (!linkUrl) return setMsg(msg, 'Please enter a link URL.');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Uploading...';
  }

  const { error } = await sb.from('resources').insert({
    title, description: desc, subject, type,
    file_url: fileUrl, link_url: linkUrl,
    downloads: 0,
    uploaded_by: currentUser.id,
    uploader_name: currentUser.user_metadata?.full_name || currentUser.email
  });

  btn.disabled = false;
  btn.textContent = 'Upload';

  if (error) return setMsg(msg, error.message);
  setMsg(msg, 'Resource uploaded!', true);
  
  // Clear form
  document.getElementById('res-title').value = '';
  document.getElementById('res-desc').value = '';
  document.getElementById('res-subject').value = '';
  document.getElementById('res-link').value = '';
  document.getElementById('res-file').value = '';
  
  setTimeout(() => showPage('browse'), 1200);
}

// ─── Browse ───────────────────────────────────────────────────────────────────
let currentPage = 1;
const itemsPerPage = 12;

async function loadResources(page = 1) {
  currentPage = page;
  const keyword = document.getElementById('search-keyword').value.trim();
  const subject = document.getElementById('filter-subject').value.trim();
  const type    = document.getElementById('filter-type').value;
  const grid    = document.getElementById('resources-grid');
  const pagination = document.getElementById('pagination');
  
  grid.innerHTML = '<p style="color:#888">Loading...</p>';
  pagination.innerHTML = '';

  let query = sb.from('resources').select('*', { count: 'exact' }).order('created_at', { ascending: false });
  if (type)    query = query.eq('type', type);
  if (subject) query = query.ilike('subject', `%${subject}%`);
  if (keyword) query = query.or(`title.ilike.%${keyword}%,description.ilike.%${keyword}%,subject.ilike.%${keyword}%`);

  const { data, error, count } = await query.range((page - 1) * itemsPerPage, page * itemsPerPage - 1);
  
  if (error || !data?.length) { 
    grid.innerHTML = '<p style="color:#888">No resources found.</p>'; 
    return; 
  }
  
  grid.innerHTML = data.map(resourceCard).join('');
  
  // Pagination
  const totalPages = Math.ceil(count / itemsPerPage);
  if (totalPages > 1) {
    pagination.innerHTML = `
      <button onclick="loadResources(${page - 1})" ${page === 1 ? 'disabled' : ''}>Previous</button>
      <span>Page ${page} of ${totalPages}</span>
      <button onclick="loadResources(${page + 1})" ${page === totalPages ? 'disabled' : ''}>Next</button>
    `;
  }
}

function typeIcon(type) {
  return { pdf: 'PDF', note: 'NOTE', link: 'LINK' }[type] || 'FILE';
}

function resourceCard(r) {
  const isOwner = currentUser && r.uploaded_by === currentUser.id;
  const isAdmin = currentUser?.user_metadata?.role === 'admin';

  const actionBtn = r.type === 'link'
    ? `<a class="btn btn-primary" href="${r.link_url}" target="_blank" rel="noopener">Open Link</a>`
    : `<a class="btn btn-primary" href="${r.file_url}" target="_blank" onclick="trackDownload('${r.id}')">Download</a>`;

  const deleteBtn = (isOwner || isAdmin)
    ? `<button class="btn btn-danger" onclick="deleteResource('${r.id}')">Delete</button>`
    : '';

  return `
    <div class="resource">
      <div class="resource-header">
        <span class="resource-type">${r.type}</span>
      </div>
      <h3 class="resource-title">${esc(r.title)}</h3>
      <p class="resource-desc">${esc(r.description || 'No description provided')}</p>
      <div class="resource-meta">
        <div>Subject: ${esc(r.subject)}</div>
        <div>By ${esc(r.uploader_name)} • ${r.downloads} downloads</div>
        <div>${new Date(r.created_at).toLocaleDateString()}</div>
      </div>
      <div class="resource-actions">
        ${actionBtn}
        ${deleteBtn}
      </div>
    </div>`;
}

async function trackDownload(id) {
  const { data } = await sb.from('resources').select('downloads').eq('id', id).single();
  if (data) await sb.from('resources').update({ downloads: data.downloads + 1 }).eq('id', id);
}

async function deleteResource(id) {
  if (!confirm('Delete this resource?')) return;
  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';
  
  await sb.from('resources').delete().eq('id', id);
  
  btn.disabled = false;
  btn.textContent = 'Delete';
  loadResources(currentPage);
}

// ─── Stats ────────────────────────────────────────────────────────────────────
async function loadStats() {
  const { data } = await sb.from('resources').select('type, downloads');
  if (!data) return;
  const pdfs    = data.filter(r => r.type === 'pdf').length;
  const notes   = data.filter(r => r.type === 'note').length;
  const links   = data.filter(r => r.type === 'link').length;
  const total   = data.reduce((s, r) => s + (r.downloads || 0), 0);
  document.getElementById('homeStats').innerHTML = `
    <div class="stat">
      <div class="stat-value">${pdfs}</div>
      <div class="stat-label">PDFs</div>
    </div>
    <div class="stat">
      <div class="stat-value">${notes}</div>
      <div class="stat-label">Notes</div>
    </div>
    <div class="stat">
      <div class="stat-value">${links}</div>
      <div class="stat-label">Links</div>
    </div>
    <div class="stat">
      <div class="stat-value">${total}</div>
      <div class="stat-label">Total Downloads</div>
    </div>
  `;
}

// ─── Admin ────────────────────────────────────────────────────────────────────
async function adminTab(tab) {
  const content = document.getElementById('admin-content');
  content.innerHTML = '<p style="color:#888;padding:20px">Loading...</p>';
  const { data: { session } } = await sb.auth.getSession();
  const token = session?.access_token;

  // Update tab buttons
  document.querySelectorAll('.tab').forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent.toLowerCase() === tab) {
      btn.classList.add('active');
    }
  });

  if (tab === 'users') {
    const res  = await fetch(`${ADMIN_API}/admin/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) { content.innerHTML = `<p style="color:#f85149;padding:20px">${data.error}</p>`; return; }
    content.innerHTML = `<table class="table">
      <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Action</th></tr></thead>
      <tbody>${data.map(u => `
        <tr>
          <td>${esc(u.name)}</td>
          <td>${esc(u.email)}</td>
          <td>${esc(u.role)}</td>
          <td>${new Date(u.created_at).toLocaleDateString()}</td>
          <td><button class="btn btn-danger" onclick="adminDeleteUser('${u.id}')">Delete</button></td>
        </tr>`).join('')}
      </tbody></table>`;
    return;
  }

  if (tab === 'resources') {
    const { data } = await sb.from('resources').select('*').order('created_at', { ascending: false });
    content.innerHTML = `<table class="table">
      <thead><tr><th>Title</th><th>Subject</th><th>Type</th><th>Uploaded By</th><th>Downloads</th><th>Action</th></tr></thead>
      <tbody>${(data||[]).map(r => `
        <tr>
          <td>${esc(r.title)}</td><td>${esc(r.subject)}</td><td>${r.type}</td>
          <td>${esc(r.uploader_name)}</td><td>${r.downloads}</td>
          <td><button class="btn btn-danger" onclick="adminDeleteResource('${r.id}')">Delete</button></td>
        </tr>`).join('')}
      </tbody></table>`;
  }
}

async function adminDeleteUser(id) {
  if (!confirm('Delete this user and all their data?')) return;
  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';
  
  const { data: { session } } = await sb.auth.getSession();
  const res = await fetch(`${ADMIN_API}/admin/users/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${session?.access_token}` }
  });
  
  btn.disabled = false;
  btn.textContent = 'Delete';
  
  if (res.ok) adminTab('users');
  else alert('Failed to delete user');
}

async function adminDeleteResource(id) {
  if (!confirm('Delete this resource?')) return;
  const btn = event.target;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';
  
  await sb.from('resources').delete().eq('id', id);
  
  btn.disabled = false;
  btn.textContent = 'Delete';
  adminTab('resources');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setMsg(el, text, success = false) {
  el.textContent = text;
  el.className = success ? 'form-message success' : 'form-message error';
}
function esc(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Init ─────────────────────────────────────────────────────────────────────
initSupabase();

// ─── Driver.js Tour ───────────────────────────────────────────────────────────
function startTour() {
  const driver = window.driver.js.driver;
  
  const driverObj = driver({
    showProgress: true,
    steps: [
      {
        element: '#tour-logo',
        popover: {
          title: 'Welcome to StudyHub',
          description: 'Your platform for sharing and accessing study materials. Let me show you around!',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '#tour-browse',
        popover: {
          title: 'Browse Resources',
          description: 'Explore thousands of study materials shared by students worldwide.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '#tour-signup',
        popover: {
          title: 'Create an Account',
          description: 'Sign up to upload your own materials and help other students.',
          side: "bottom",
          align: 'end'
        }
      },
      {
        element: '#tour-browse-btn',
        popover: {
          title: 'Start Exploring',
          description: 'Click here to browse all available resources.',
          side: "top",
          align: 'center'
        }
      },
      {
        popover: {
          title: 'Ready to Go!',
          description: 'You\'re all set! Click the Help button anytime to see this tour again.',
        }
      }
    ]
  });

  driverObj.drive();
}

// Auto-start tour for first-time visitors
if (!localStorage.getItem('studyhub-tour-completed')) {
  setTimeout(() => {
    startTour();
    localStorage.setItem('studyhub-tour-completed', 'true');
  }, 1000);
}
