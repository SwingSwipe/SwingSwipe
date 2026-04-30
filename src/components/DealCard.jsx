const SOURCE_COLORS = {
  '2ndSwing': 'bg-blue-100 text-blue-700',
  eBay: 'bg-yellow-100 text-yellow-800',
  GlobalGolf: 'bg-green-100 text-green-700',
}

const CONDITION_LABELS = {
  like_new: 'Like new',
  excellent: 'Excellent',
  good: 'Good',
  average: 'Average',
}

export default function DealCard({ deal }) {
  return (
    <div className="card mb-3 overflow-hidden">
      {deal.image_url && (
        <img
          src={deal.image_url}
          alt={deal.title}
          className="w-full h-40 object-cover"
          onError={e => { e.target.style.display = 'none' }}
        />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <div className="flex-1 pr-2">
            {deal.brand && (
              <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide mb-0.5">{deal.brand}</p>
            )}
            <h3 className="font-semibold text-[15px] leading-tight">{deal.title}</h3>
          </div>
          {deal.source && (
            <span className={`pill text-xs whitespace-nowrap ${SOURCE_COLORS[deal.source] || 'bg-gray-100 text-gray-600'}`}>
              {deal.source}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2 mb-3">
          <span className="text-xl font-bold text-[#1D9E75]">${deal.price}</span>
          {deal.original_price && (
            <span className="text-sm text-gray-400 line-through">${deal.original_price}</span>
          )}
          {deal.discount_pct && (
            <span className="text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
              -{deal.discount_pct}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mb-3">
          {deal.condition && (
            <span className="pill bg-gray-100 text-gray-600 text-xs">
              {CONDITION_LABELS[deal.condition] || deal.condition}
            </span>
          )}
          {deal.category && (
            <span className="pill bg-gray-100 text-gray-600 text-xs capitalize">
              {deal.category}
            </span>
          )}
        </div>

        <a
          href={deal.affiliate_url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary py-2.5 text-sm block text-center"
        >
          View deal →
        </a>
      </div>
    </div>
  )
}
