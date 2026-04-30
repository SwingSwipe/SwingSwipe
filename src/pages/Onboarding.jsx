import { useState } from 'react'
import { supabase } from '../supabase'

const HANDICAP_OPTIONS = [
  { value: 'beginner', label: 'Beginner', sub: 'Just starting out' },
  { value: '90s', label: '90s shooter', sub: 'Scores 90–99' },
  { value: '80s', label: '80s shooter', sub: 'Scores 80–89' },
  { value: '70s', label: '70s shooter', sub: 'Scores 70–79' },
  { value: 'scratch', label: 'Scratch', sub: 'Plays to 0 or better' },
]

const VIBE_OPTIONS = [
  { value: 'bread_game', label: '🍞 Bread game' },
  { value: 'casual', label: '😊 Casual' },
  { value: 'competitive', label: '🏆 Competitive' },
  { value: 'social', label: '🤝 Social' },
  { value: 'practice_focused', label: '🎯 Practice focused' },
]

const AVAIL_OPTIONS = [
  { value: 'weekend_mornings', label: 'Weekend AM' },
  { value: 'weekday_mornings', label: 'Weekday AM' },
  { value: 'weekend_afternoons', label: 'Weekend PM' },
  { value: 'flexible', label: 'Flexible' },
]

const STEPS = [
  { emoji: '👋', title: "What's your name?" },
  { emoji: '📍', title: 'Where do you play?' },
  { emoji: '⛳', title: 'Your game' },
  { emoji: '⏱️', title: 'How do you like to play?' },
  { emoji: '✌️', title: 'Your golf vibe' },
]

export default function Onboarding({ user, onComplete }) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState({
    name: '',
    location: '',
    home_course: '',
    handicap_range: '',
    avg_score: '',
    availability: [],
    pace: '',
    cart_or_walk: '',
    vibe_tags: [],
    bio_prompt: '',
  })

  const set = (key, val) => setData(d => ({ ...d, [key]: val }))
  const toggleArray = (key, val) => setData(d => ({
    ...d,
    [key]: d[key].includes(val) ? d[key].filter(v => v !== val) : [...d[key], val],
  }))

  const canProceed = () => {
    if (step === 1) return data.name.trim().length > 0
    if (step === 3) return data.handicap_range !== ''
    if (step === 4) return data.pace !== ''
    return true
  }

  const next = () => setStep(s => s + 1)
  const back = () => setStep(s => s - 1)

  const handleFinish = async () => {
    setSaving(true)
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      name: data.name.trim(),
      location: data.location,
      home_course: data.home_course,
      handicap_range: data.handicap_range,
      avg_score: data.avg_score ? parseFloat(data.avg_score) : null,
      availability: data.availability,
      pace: data.pace,
      cart_or_walk: data.cart_or_walk,
      vibe_tags: data.vibe_tags,
      bio_prompt: data.bio_prompt,
    })
    setSaving(false)
    if (!error) onComplete()
  }

  const currentStep = STEPS[step - 1]

  return (
    <div className="min-h-screen bg-[#f0f2f0] flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <div
          className="h-1 bg-[#1D9E75] transition-all duration-500"
          style={{ width: `${(step / STEPS.length) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col px-6 pt-10 pb-6 max-w-sm mx-auto w-full">
        <p className="text-xs text-gray-400 mb-2 font-medium tracking-wide uppercase">Step {step} of {STEPS.length}</p>
        <div className="mb-8">
          <span className="text-4xl mb-3 block">{currentStep.emoji}</span>
          <h2 className="text-2xl font-black text-gray-900">{currentStep.title}</h2>
        </div>

        {/* Step 1 — Name */}
        {step === 1 && (
          <div className="flex-1 flex flex-col gap-3">
            <input
              className="input-field text-base"
              placeholder="First and last name"
              value={data.name}
              onChange={e => set('name', e.target.value)}
              autoFocus
            />
            <p className="text-xs text-gray-400">This is how other golfers will see you. You can't change it later (for now).</p>
          </div>
        )}

        {/* Step 2 — Location */}
        {step === 2 && (
          <div className="flex-1 flex flex-col gap-3">
            <input
              className="input-field"
              placeholder="City, State (e.g. Austin, TX)"
              value={data.location}
              onChange={e => set('location', e.target.value)}
            />
            <input
              className="input-field"
              placeholder="Home course (e.g. Bethpage Black)"
              value={data.home_course}
              onChange={e => set('home_course', e.target.value)}
            />
            <p className="text-xs text-gray-400">Used to find rounds near you. You can skip this and add it later.</p>
          </div>
        )}

        {/* Step 3 — Handicap */}
        {step === 3 && (
          <div className="flex-1 flex flex-col">
            <p className="text-sm font-semibold text-gray-600 mb-3">Pick your skill level <span className="text-red-400">*</span></p>
            <div className="space-y-2 mb-5">
              {HANDICAP_OPTIONS.map(h => (
                <button
                  key={h.value}
                  onClick={() => set('handicap_range', h.value)}
                  className={`w-full text-left px-4 py-3 rounded-[12px] border-2 transition-all ${
                    data.handicap_range === h.value
                      ? 'border-[#1D9E75] bg-[#1D9E75]/5'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <p className={`font-bold text-sm ${data.handicap_range === h.value ? 'text-[#1D9E75]' : 'text-gray-800'}`}>{h.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{h.sub}</p>
                </button>
              ))}
            </div>
            <input
              className="input-field"
              type="number"
              placeholder="Avg score (optional, e.g. 88)"
              value={data.avg_score}
              onChange={e => set('avg_score', e.target.value)}
            />
          </div>
        )}

        {/* Step 4 — Pace + Cart */}
        {step === 4 && (
          <div className="flex-1 flex flex-col gap-5">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Pace of play <span className="text-red-400">*</span></p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'fast', label: '⚡ Fast', sub: 'Under 4 hrs' },
                  { value: 'moderate', label: '🚶 Moderate', sub: '4–4.5 hrs' },
                  { value: 'relaxed', label: '😌 Relaxed', sub: 'No rush' },
                ].map(p => (
                  <button
                    key={p.value}
                    onClick={() => set('pace', p.value)}
                    className={`py-3 px-2 rounded-[12px] border-2 text-center transition-all ${
                      data.pace === p.value ? 'border-[#1D9E75] bg-[#1D9E75]/5' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <p className="text-base mb-0.5">{p.label.split(' ')[0]}</p>
                    <p className={`text-xs font-semibold ${data.pace === p.value ? 'text-[#1D9E75]' : 'text-gray-700'}`}>{p.label.split(' ')[1]}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{p.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Cart or walk?</p>
              <div className="flex gap-2">
                {[['cart', '🛺 Cart'], ['walking', '🚶 Walk'], ['either', '🤷 Either']].map(([v, l]) => (
                  <button key={v} onClick={() => set('cart_or_walk', v)}
                    className={`pill flex-1 py-2 ${data.cart_or_walk === v ? 'pill-active' : 'pill-inactive'}`}>{l}</button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Availability</p>
              <div className="flex flex-wrap gap-2">
                {AVAIL_OPTIONS.map(({ value, label }) => (
                  <button key={value} onClick={() => toggleArray('availability', value)}
                    className={`pill ${data.availability.includes(value) ? 'pill-active' : 'pill-inactive'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 5 — Vibe */}
        {step === 5 && (
          <div className="flex-1 flex flex-col gap-5">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Pick up to 3 that describe you</p>
              <div className="flex flex-wrap gap-2">
                {VIBE_OPTIONS.map(v => (
                  <button
                    key={v.value}
                    onClick={() => {
                      if (data.vibe_tags.includes(v.value)) toggleArray('vibe_tags', v.value)
                      else if (data.vibe_tags.length < 3) toggleArray('vibe_tags', v.value)
                    }}
                    className={`pill ${data.vibe_tags.includes(v.value) ? 'pill-active' : 'pill-inactive'}`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-600 mb-1">Best course you've played?</p>
              <p className="text-xs text-gray-400 mb-2">Shows on your profile — gives people something to talk about.</p>
              <input
                className="input-field"
                placeholder="e.g. Pebble Beach"
                value={data.bio_prompt}
                onChange={e => set('bio_prompt', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-auto pt-6">
          {step > 1 && (
            <button onClick={back} className="flex-1 py-3 rounded-[10px] border border-gray-200 bg-white text-gray-600 font-semibold text-sm">
              Back
            </button>
          )}
          {step < STEPS.length ? (
            <button
              onClick={next}
              disabled={!canProceed()}
              className={`flex-1 py-3 rounded-[10px] font-bold text-sm transition-all ${
                canProceed()
                  ? 'bg-[#1D9E75] text-white active:opacity-80'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={saving || !canProceed()}
              className="flex-1 py-3 rounded-[10px] bg-[#1D9E75] text-white font-bold text-sm active:opacity-80 disabled:opacity-50"
            >
              {saving ? 'Setting up…' : "Let's tee it up ⛳"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
