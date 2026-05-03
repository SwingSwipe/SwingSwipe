export default function HeroHeader({
  eyebrow,
  title,
  subtitle,
  children,
  action,
  icon = '⛳',
  compact = false,
}) {
  return (
    <div className={`page-header ${compact ? 'pb-4' : 'pb-5'}`}>
      <div className="hero-orb -right-8 -top-8 w-32 h-32 float-soft" />
      <div className="hero-orb right-16 bottom-6 w-12 h-12 opacity-60 float-soft" style={{ animationDelay: '1.1s' }} />
      <div className="absolute right-5 top-8 text-6xl opacity-15 rotate-[-10deg] float-soft" aria-hidden="true">
        {icon}
      </div>

      <div className="relative z-10">
        {eyebrow && <p className="text-white/65 text-xs font-black uppercase tracking-widest mb-1">{eyebrow}</p>}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-white text-2xl font-black leading-tight">{title}</h1>
            {subtitle && <p className="text-white/76 text-xs mt-1">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  )
}
