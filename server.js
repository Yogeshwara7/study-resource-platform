require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// Serve config endpoint for frontend
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_ANON_KEY
  });
});

// Admin Supabase client — uses service key to bypass RLS
const adminSb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ─── Verify admin token ───────────────────────────────────────
async function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  const { data: { user }, error } = await adminSb.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });
  if (user.user_metadata?.role !== 'admin')
    return res.status(403).json({ error: 'Admin access only' });
  req.adminUser = user;
  next();
}

// ─── Admin routes ─────────────────────────────────────────────
app.get('/admin/users', requireAdmin, async (req, res) => {
  const { data, error } = await adminSb.auth.admin.listUsers();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.users.map(u => ({
    id:         u.id,
    email:      u.email,
    name:       u.user_metadata?.full_name || '-',
    role:       u.user_metadata?.role || 'student',
    created_at: u.created_at
  })));
});

app.delete('/admin/users/:id', requireAdmin, async (req, res) => {
  const { error } = await adminSb.auth.admin.deleteUser(req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ msg: 'User deleted' });
});

// Fallback to index.html
app.get('*', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

const PORT = process.env.PORT || 3003;
app.listen(PORT, () =>
  console.log(`Study Resource Platform running on http://localhost:${PORT}`)
);
