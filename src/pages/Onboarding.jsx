import { useState } from 'react'
import { supabase } from '../supabase'

const VIBE_OPTIONS = ['bread_game', 'casual', 'competitive', 'social', 'practice_focused']
const VIBE_LABELS = {
  bread_game: '🍞 Bread game',
  casual: '😊 Casual',
  competitive: '🏆 Competitive',
  social: '🤝 Social',
  practice_focused: '🎯 Practice focused',
}
const AVAIL_OPTIONS = [
  { value: 'weekend_mornings', label: 'Weekend mornings' },
  { value: 'weekday_mornings', label: 'Weekday mornings' },
  { value: 'weekend_afternoons', label: 'Weekend afternoons' },
  { value: 'flexible', label: 'Flexible' },
]

export default function Onboarding({ user, onComplete }) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState({
    name: '',
    avatar_url: '',
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

  const toggleArray = (key, val) => {
    setData(d => ({
      ...d,
      [key]: d[key].includes(val)
        ? d[key].filter(v => v !== val)
        : [...d[key], val],
    }))
  }

  const next = () => setStep(s => s + 1)
  const back = () => setStep(s => s - 1)

  const handleFinish = async () => {
    setSaving(true)
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      name: data.name,
      avatar_url: data.avatar_url || null,
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

  const progress = (step / 5) * 100

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-gray-200">
        <div
          className="h-1 bg-[#1D9E75] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col px-6 pt-8 pb-6 max-w-sm mx-auto w-full">
        <p className="text-xs text-gray-400 mb-6">Step {step} of 5</p>

        {step === 1 && (
          <div className="flex-1 flex flex-col">
            <h2 className="text-2xl font-bold mb-1">What's your name?</h2>
            <p className="text-gray-500 text-sm mb-8">How you'll appear to other golfers.</p>
            <input
              className="input-field mb-4"
              placeholder="Full name"
              value={data.name}
              onChange={e => set('name', e.target.value)}
            />
            <input
              className="input-field"
              placeholder="Profile photo URL (optional)"
              value={data.avatar_url}
              onChange={e => set('avatar_url', e.target.value)}
            />
          </div>
        )}

        {step === 2 && (
          <div className="flex-1 flex flex-col">
            <h2 className="text-2xl font-bold mb-1">Where do you play?</h2>
            <p className="text-gray-500 text-sm mb-8">Helps us find rounds near you.</p>
            <input
              className="input-field mb-4"
              placeholder="Location (e.g. Bethpage, NY)"
              value={data.location}
              onChange={e => set('location', e.target.value)}
            />
            <input
              className="input-field"
              placeholder="Home course (e.g. Bethpage Red)"
              value={data.home_course}
              onChange={e => set('home_course', e.target.value)}
            />
          </div>
        )}

        {step === 3 && (
          <div className="flex-1 flex flex-col">
            <h2 className="text-2xl font-bold mb-1">Your game</h2>
            <p className="text-gray-500 text-sm mb-6">Helps match you with compatible partners.</p>
            <p className="text-sm font-medium mb-2">Handicap range</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {['beginner', '90s', '80s', '70s', 'scratch'].map(h => (
                <button
                  key={h}
                  onClick={() => set('handicap_range', h)}
                  className={`pill ${data.handicap_range === h ? 'pill-active' : 'pill-inactive'}`}
                >
                  {h === 'beginner' ? 'Beginner' : h === 'scratch' ? 'Scratch' : `${h}`}
                </button>
              ))}
            </div>
            <input
              className="input-field"
              type="number"
              placeholder="Avg score (e.g. 88)"
              value={data.avg_score}
              onChange={e => set('avg_score', e.target.value)}
            />
          </div>
        )}

        {step === 4 && (
          <div className="flex-1 flex flex-col">
            <h2 className="text-2xl font-bold mb-1">When do you play?</h2>
            <p className="text-gray-500 text-sm mb-6">Select all that apply.</p>

            <p className="text-sm font-medium mb-2">Availability</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {AVAIL_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => toggleArray('availability', value)}
                  className={`pill ${data.availability.includes(value) ? 'pill-active' : 'pill-inactive'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="text-sm font-medium mb-2">Pace of play</p>
            <div className="flex gap-2 mb-6">
              {['fast', 'moderate', 'relaxed'].map(p => (
                <button
                  key={p}
                  onClick={() => set('pace', p)}
                  className={`pill capitalize ${data.pace === p ? 'pill-active' : 'pill-inactive'}`}
                >
                  {p}
                </button>
              ))}
            </div>

            <p className="text-sm font-medium mb-2">Cart or walk?</p>
            <div className="flex gap-2">
              {['cart', 'walking', 'either'].map(c => (
                <button
                  key={c}
                  onClick={() => set('cart_or_walk', c)}
                  className={`pill capitalize ${data.cart_or_walk === c ? 'pill-active' : 'pill-inactive'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="flex-1 flex flex-col">
            <h2 className="text-2xl font-bold mb-1">Your golf vibe</h2>
            <p className="text-gray-500 text-sm mb-6">Pick up to 3 that describe you.</p>

            <div className="flex flex-wrap gap-2 mb-6">
              {VIBE_OPTIONS.map(v => (
                <button
                  key={v}
                  onClick={() => {
                    if (data.vibe_tags.includes(v)) {
                      toggleArray('vibe_tags', v)
                    } else if (data.vibe_tags.length < 3) {
                      toggleArray('vibe_tags', v)
                    }
                  }}
                  className={`pill ${data.vibe_tags.includes(v) ? 'pill-active' : 'pill-inactive'}`}
                >
                  {VIBE_LABELS[v]}
                </button>
              ))}
            </div>

            <p className="text-sm font-medium mb-2">Complete this sentence:</p>
            <p className="text-sm text-gray-500 mb-2">Best course I've played:</p>
            <input
              className="input-field"
              placeholder="e.g. Bethpage Black"
              value={data.bio_prompt}
              onChange={e => set('bio_prompt', e.target.value)}
            />
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-auto pt-6">
          {step > 1 && (
            <button onClick={back} className="btn-secondary flex-1">Back</button>
          )}
          {step < 5 ? (
            <button
              onClick={next}
              className="btn-primary flex-1"
              disabled={step === 1 && !data.name.trim()}
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="btn-primary flex-1"
              disabled={saving}
            >
              {saving ? 'Saving…' : "Let's tee it up ⛳"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
