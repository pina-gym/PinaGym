// Edge Function admin-users: buat user, reset password, hapus/nonaktifkan user.
// Butuh service_role, jadi tidak boleh dijalankan dari browser. Hanya pemegang permission user.manage yang boleh memanggil.
// Pasang: Supabase Dashboard -> Edge Functions -> Deploy a new function -> nama "admin-users" -> tempel file ini.
// (atau: supabase functions deploy admin-users). Biarkan "Verify JWT" aktif.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const out = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return out({ error: 'Metode tidak didukung' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const auth = req.headers.get('Authorization') ?? ''

  // 1) siapa yang memanggil, dan apakah berhak?
  const caller = createClient(url, anon, { global: { headers: { Authorization: auth } } })
  const { data: me } = await caller.auth.getUser()
  if (!me?.user) return out({ error: 'Belum login' }, 401)
  const { data: allowed } = await caller.rpc('has_perm', { p: 'user.manage' })
  if (allowed !== true) return out({ error: 'Tidak berhak mengelola user' }, 403)

  const admin = createClient(url, svc, { auth: { autoRefreshToken: false, persistSession: false } })
  let b: Record<string, string>
  try { b = await req.json() } catch { return out({ error: 'Body bukan JSON' }, 400) }

  const ROLES = ['admin', 'kasir', 'receptionist']
  const adminsLeft = async (excludeId: string) => {
    const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true })
      .eq('role', 'admin').eq('active', true).neq('id', excludeId)
    return count ?? 0
  }

  if (b.action === 'create') {
    const username = String(b.username ?? '').trim().toLowerCase()
    if (!/^[a-z0-9_.-]{3,30}$/.test(username)) return out({ error: 'Username 3-30 karakter: huruf kecil, angka, titik, strip, garis bawah' }, 400)
    if (!ROLES.includes(b.role)) return out({ error: 'Role tidak valid' }, 400)
    if (String(b.password ?? '').length < 6) return out({ error: 'Password minimal 6 karakter' }, 400)
    const { data, error } = await admin.auth.admin.createUser({
      email: `${username}@pinagym.app`, password: b.password, email_confirm: true,
    })
    if (error || !data.user) return out({ error: error?.message ?? 'Gagal membuat akun' }, 400)
    const { error: e2 } = await admin.from('profiles').insert({
      id: data.user.id, username, name: String(b.name ?? username).trim() || username, role: b.role,
    })
    if (e2) { await admin.auth.admin.deleteUser(data.user.id); return out({ error: e2.message }, 400) }
    return out({ ok: true, id: data.user.id })
  }

  if (b.action === 'reset') {
    if (String(b.password ?? '').length < 6) return out({ error: 'Password minimal 6 karakter' }, 400)
    const { error } = await admin.auth.admin.updateUserById(b.user_id, { password: b.password })
    return error ? out({ error: error.message }, 400) : out({ ok: true })
  }

  if (b.action === 'delete') {
    if (b.user_id === me.user.id) return out({ error: 'Tidak bisa menghapus akun sendiri' }, 400)
    const { data: t } = await admin.from('profiles').select('role,active').eq('id', b.user_id).maybeSingle()
    if (t?.role === 'admin' && t.active && (await adminsLeft(b.user_id)) < 1)
      return out({ error: 'Harus ada minimal satu admin aktif' }, 400)
    // User yang sudah punya riwayat (transaksi, shift, dsb.) tidak bisa dihapus: dinonaktifkan agar riwayat tetap utuh.
    const del = await admin.from('profiles').delete().eq('id', b.user_id)
    if (del.error) {
      await admin.from('profiles').update({ active: false }).eq('id', b.user_id)
      await admin.auth.admin.updateUserById(b.user_id, { ban_duration: '876000h' })
      return out({ ok: true, deactivated: true })
    }
    await admin.auth.admin.deleteUser(b.user_id)
    return out({ ok: true })
  }

  return out({ error: 'Aksi tidak dikenal' }, 400)
})
