import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { exportToPDF } from './lib/pdf'

function Login({ onLoggedIn }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    })
    setLoading(false)
    if (error) alert('Erro: ' + error.message)
    else alert('Link enviado! Verifique seu e-mail.')
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) onLoggedIn(data.session.user)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      onLoggedIn(session?.user || null)
    })
    return () => sub.subscription.unsubscribe()
  }, [onLoggedIn])

  return (
    <form onSubmit={submit} className="max-w-md mx-auto p-6 mt-16 bg-white rounded shadow">
      <h1 className="text-2xl font-semibold mb-3">Entrar</h1>
      <input
        className="w-full border px-3 py-2 rounded mb-2"
        type="email"
        required
        placeholder="seu@email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button className="px-4 py-2 bg-black text-white rounded" disabled={loading}>
        {loading ? 'Enviando...' : 'Enviar link mágico'}
      </button>
    </form>
  )
}

async function uploadToStorage(file, path) {
  const { error } = await supabase.storage.from('fichas').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('fichas').getPublicUrl(path)
  return data.publicUrl
}

export default function App() {
  const [user, setUser] = useState(null)

  const [pedido, setPedido] = useState('')
  const [cliente, setCliente] = useState('')
  const [obs, setObs] = useState('')
  const [materiais, setMateriais] = useState([])

  const [layoutFile, setLayoutFile] = useState(null)
  const [producaoFile, setProducaoFile] = useState(null)
  const [layoutUrl, setLayoutUrl] = useState('')
  const [producaoUrl, setProducaoUrl] = useState('')

  const [list, setList] = useState([])
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null))
    supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user || null))
  }, [])

  useEffect(() => { if (user) fetchList() }, [user])

  const addMat = () =>
    setMateriais((m) => [...m, { tipo: 'PVC', espessura: '5mm', quantidade: 1, descricao: '' }])
  const updMat = (i, p) => setMateriais((m) => m.map((x, ix) => (ix === i ? { ...x, ...p } : x)))
  const rmMat = (i) => setMateriais((m) => m.filter((_, ix) => ix !== i))

  async function fetchList() {
    const { data, error } = await supabase
      .from('fichas')
      .select('id,pedido,cliente,created_at')
      .order('created_at', { ascending: false })
    if (!error) setList(data || [])
  }

  async function save() {
    try {
      setSaving(true)
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) return alert('Faça login')

      const id = crypto.randomUUID()
      let l = layoutUrl
      let p = producaoUrl

      if (layoutFile) l = await uploadToStorage(layoutFile, `${u.id}/fichas/${id}/layout-${layoutFile.name}`)
      if (producaoFile) p = await uploadToStorage(producaoFile, `${u.id}/fichas/${id}/producao-${producaoFile.name}`)

      const payload = { obs, materiais }

      const { error } = await supabase.from('fichas').insert({
        id,
        pedido,
        cliente,
        payload,
        layoutUrl: l || null,     // <-- camelCase: igual ao SQL criado
        producaoUrl: p || null    // <-- camelCase: igual ao SQL criado
      })
      if (error) throw error

      await fetchList()
      alert('Ficha salva!')
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function openFicha(id) {
    const { data, error } = await supabase.from('fichas').select('*').eq('id', id).single()
    if (error) return alert(error.message)
    setPedido(data.pedido || '')
    setCliente(data.cliente || '')
    setObs(data.payload?.obs || '')
    setMateriais(data.payload?.materiais || [])
    setLayoutUrl(data.layoutUrl || '')
    setProducaoUrl(data.producaoUrl || '')
    window.s
