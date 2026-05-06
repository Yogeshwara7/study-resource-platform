const SUPABASE_URL = 'https://gzlgufleaukelahqwofx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bGd1ZmxlYXVrZWxhaHF3b2Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NjQ4MTgsImV4cCI6MjA5MzA0MDgxOH0.eQTq-kLKV7E9XYTOVZMosZuG41Gfgq5sJD8sZUaE778';
const ADMIN_API    = ''; // same origin — works locally and on Render
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

// ─── Nav ──────────────────────────────────────────────────────────────────────
function updateNav() {
  const u = currentUser;
  document.getElementById('loginLink').style.display  = u ? 'none' : '';
  document.getElementById('regLink').style.display    = u ? 'none' : '';
  document.getElementById('logoutLink').style.display = u ? '' : 'none';
  document.getElementById('uploadLink').style.display = u ? '' : 'none';
  document.getElementById('adminLink').style.display  = (u?.user_metadata?.role === 'admin') ? '' : 'none';
}

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${name}`).classList.add('active');
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

  const { error } = await sb.auth.signUp({
    email, password: pass,
    options: { data: { full_name: name } }
  });
  if (error) return setMsg(msg, error.message);
  setMsg(msg, 'Account created! Check your email to confirm.', true);
}

async function login() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value;
  const msg   = document.getElementById('login-msg');

  const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (error) return setMsg(msg, error.message);
  currentUser = data.user;
  updateNav();
  showPage('home');
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

  if (!title || !subject) return setMsg(msg, 'Title and subject are required.');

  let fileUrl = '';
  if (type !== 'link') {
    if (!file) return setMsg(msg, 'Please select a file.');
    const ext  = file.name.split('.').pop();
    const path = `resources/${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage.from('study-files').upload(path, file);
    if (upErr) return setMsg(msg, upErr.message);
    const { data: urlData } = sb.storage.from('study-files').getPublicUrl(path);
    fileUrl = urlData.publicUrl;
  } else {
    if (!linkUrl) return setMsg(msg, 'Please enter a link URL.');
  }

  const { error } = await sb.from('resources').insert({
    title, description: desc, subject, type,
    file_url: fileUrl, link_url: linkUrl,
    downloads: 0,
    uploaded_by: currentUser.id,
    uploader_name: currentUser.user_metadata?.full_name || currentUser.email
  });

  if (error) return setMsg(msg, error.message);
  setMsg(msg, 'Resource uploaded!', true);
  setTimeout(() => showPage('browse'), 1200);
}

// ─── Browse ───────────────────────────────────────────────────────────────────
async function loadResources() {
  const keyword = document.getElementById('search-keyword').value.trim();
  const subject = document.getElementById('filter-subject').value.trim();
  const type    = document.getElementById('filter-type').value;
  const grid    = document.getElementById('resources-grid');
  grid.innerHTML = '<p style="color:#888">Loading...</p>';

  let query = sb.from('resources').select('*').order('created_at', { ascending: false });
  if (type)    query = query.eq('type', type);
  if (subject) query = query.ilike('subject', `%${subject}%`);
  if (keyword) query = query.or(`title.ilike.%${keyword}%,description.ilike.%${keyword}%,subject.ilike.%${keyword}%`);

  const { data, error } = await query;
  if (error || !data?.length) { grid.innerHTML = '<p style="color:#888">No resources found.</p>'; return; }
  grid.innerHTML = data.map(resourceCard).join('');
}

function typeIcon(type) {
  return { pdf: 'PDF', note: 'NOTE', link: 'LINK' }[type] || 'FILE';
}

function resourceCard(r) {
  const isOwner = currentUser && r.uploaded_by === currentUser.id;
  const isAdmin = currentUser?.user_metadata?.role === 'admin';

  const actionBtn = r.type === 'link'
    ? `<a class="btn-download" href="${r.link_url}" target="_blank" rel="noopener">Open Link</a>`
    : `<a class="btn-download" href="${r.file_url}" target="_blank" onclick="trackDownload('${r.id}')">Download</a>`;

  const deleteBtn = (isOwner || isAdmin)
    ? `<button class="btn-delete" onclick="deleteResource('${r.id}')">Delete</button>`
    : '';

  return `
    <div class="resource-card">
      <div class="icon">${typeIcon(r.type)}</div>
      <span class="badge ${r.type}">${r.type}</span>
      <h3>${esc(r.title)}</h3>
      <p>${esc(r.description || '')}</p>
      <p><strong>Subject:</strong> ${esc(r.subject)}</p>
      <p class="meta">By ${esc(r.uploader_name)} | ${r.downloads} downloads</p>
      <p class="meta">${new Date(r.created_at).toLocaleDateString()}</p>
      <div class="card-actions">
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
  await sb.from('resources').delete().eq('id', id);
  loadResources();
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
    <div class="stat-card"><div class="num">${pdfs}</div><div class="label">PDFs</div></div>
    <div class="stat-card"><div class="num">${notes}</div><div class="label">Notes</div></div>
    <div class="stat-card"><div class="num">${links}</div><div class="label">Links</div></div>
    <div class="stat-card"><div class="num">${total}</div><div class="label">Downloads</div></div>
  `;
}

// ─── Admin ────────────────────────────────────────────────────────────────────
async function adminTab(tab) {
  const content = document.getElementById('admin-content');
  content.innerHTML = '<p style="color:#aaa">Loading...</p>';
  const { data: { session } } = await sb.auth.getSession();
  const token = session?.access_token;

  if (tab === 'users') {
    const res  = await fetch(`${ADMIN_API}/admin/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) { content.innerHTML = `<p style="color:red">${data.error}</p>`; return; }
    content.innerHTML = `<table class="admin-table">
      <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Action</th></tr></thead>
      <tbody>${data.map(u => `
        <tr>
          <td>${esc(u.name)}</td>
          <td>${esc(u.email)}</td>
          <td>${esc(u.role)}</td>
          <td>${new Date(u.created_at).toLocaleDateString()}</td>
          <td><button onclick="adminDeleteUser('${u.id}')">Delete</button></td>
        </tr>`).join('')}
      </tbody></table>`;
    return;
  }

  if (tab === 'resources') {
    const { data } = await sb.from('resources').select('*').order('created_at', { ascending: false });
    content.innerHTML = `<table class="admin-table">
      <thead><tr><th>Title</th><th>Subject</th><th>Type</th><th>Uploaded By</th><th>Downloads</th><th>Action</th></tr></thead>
      <tbody>${(data||[]).map(r => `
        <tr>
          <td>${esc(r.title)}</td><td>${esc(r.subject)}</td><td>${r.type}</td>
          <td>${esc(r.uploader_name)}</td><td>${r.downloads}</td>
          <td><button onclick="adminDeleteResource('${r.id}')">Delete</button></td>
        </tr>`).join('')}
      </tbody></table>`;
  }
}

async function adminDeleteUser(id) {
  if (!confirm('Delete this user and all their data?')) return;
  const { data: { session } } = await sb.auth.getSession();
  const res = await fetch(`${ADMIN_API}/admin/users/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${session?.access_token}` }
  });
  if (res.ok) adminTab('users');
  else alert('Failed to delete user');
}

async function adminDeleteResource(id) {
  if (!confirm('Delete this resource?')) return;
  await sb.from('resources').delete().eq('id', id);
  adminTab('resources');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setMsg(el, text, success = false) {
  el.textContent = text;
  el.className = 'msg' + (success ? ' success' : '');
}
function esc(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Init ─────────────────────────────────────────────────────────────────────
sb.auth.getSession().then(({ data }) => {
  if (data.session) { currentUser = data.session.user; }
  updateNav();
  loadStats();
});

sb.auth.onAuthStateChange((event, session) => {
  currentUser = session?.user || null;
  updateNav();
});
