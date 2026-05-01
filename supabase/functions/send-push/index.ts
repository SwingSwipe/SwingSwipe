import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Convert base64url to Uint8Array
function b64url(s: string) {
  const b = s.replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b)
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

async function getVapidHeaders(endpoint: string, body: string) {
  const url = new URL(endpoint)
  const audience = `${url.protocol}//${url.host}`
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600

  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const payload = btoa(JSON.stringify({ aud: audience, exp, sub: 'mailto:info@swingswipe.app' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const toSign = `${header}.${payload}`

  const privKey = await crypto.subtle.importKey(
    'raw', b64url(VAPID_PRIVATE_KEY),
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privKey, new TextEncoder().encode(toSign))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const jwt = `${toSign}.${sigB64}`

  return {
    Authorization: `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
    'Content-Type': 'application/octet-stream',
    'Content-Encoding': 'aes128gcm',
    TTL: '86400',
  }
}

async function encryptPayload(subscription: { keys: { p256dh: string; auth: string } }, payload: string) {
  const clientPublicKey = b64url(subscription.keys.p256dh)
  const clientAuthSecret = b64url(subscription.keys.auth)
  const encoder = new TextEncoder()
  const content = encoder.encode(payload)

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const serverKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const serverPublicKeyRaw = await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)

  const clientKey = await crypto.subtle.importKey('raw', clientPublicKey, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const sharedBits = await crypto.subtle.deriveBits({ name: 'ECDH', public: clientKey }, serverKeyPair.privateKey, 256)

  const prk = await crypto.subtle.importKey('raw', await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: clientAuthSecret, info: encoder.encode('Content-Encoding: auth\0') },
    await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveBits']), 256
  ), 'HKDF', false, ['deriveBits'])

  const keyInfo = new Uint8Array([...encoder.encode('Content-Encoding: aes128gcm\0'), 0, ...new Uint8Array(serverPublicKeyRaw), ...clientPublicKey])
  const nonceInfo = new Uint8Array([...encoder.encode('Content-Encoding: nonce\0'), 0, ...new Uint8Array(serverPublicKeyRaw), ...clientPublicKey])

  const [keyBits, nonceBits] = await Promise.all([
    crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: keyInfo }, prk, 128),
    crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo }, prk, 96),
  ])

  const key = await crypto.subtle.importKey('raw', keyBits, 'AES-GCM', false, ['encrypt'])
  const padded = new Uint8Array([...content, 2])
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonceBits }, key, padded)

  const rs = 4096
  const header = new Uint8Array([...salt, ...new Uint8Array(new Uint32Array([rs]).buffer), serverPublicKeyRaw.byteLength, ...new Uint8Array(serverPublicKeyRaw)])
  return new Uint8Array([...header, ...new Uint8Array(encrypted)])
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })

  try {
    const { user_id, title, body } = await req.json()
    if (!user_id || !title) return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 })

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data: sub } = await supabase.from('push_subscriptions').select('subscription').eq('user_id', user_id).single()
    if (!sub) return new Response(JSON.stringify({ ok: false, reason: 'no subscription' }), { status: 200 })

    const subscription = sub.subscription
    const payload = JSON.stringify({ title, body })
    const encrypted = await encryptPayload(subscription, payload)
    const headers = await getVapidHeaders(subscription.endpoint, payload)

    const res = await fetch(subscription.endpoint, { method: 'POST', headers, body: encrypted })
    return new Response(JSON.stringify({ ok: res.ok, status: res.status }), {
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
