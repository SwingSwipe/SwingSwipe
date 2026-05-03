function Bone({ className = '' }) {
  return <div className={`bg-gray-200 rounded-[8px] animate-pulse ${className}`} />
}

export function PlayerCardSkeleton() {
  return (
    <div className="card feed-card p-4 mb-3">
      <div className="flex items-start gap-3">
        <Bone className="w-14 h-14 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Bone className="h-4 w-32" />
          <Bone className="h-3 w-24" />
          <div className="flex gap-2 mt-2">
            <Bone className="h-6 w-16 rounded-full" />
            <Bone className="h-6 w-20 rounded-full" />
          </div>
        </div>
        <Bone className="h-6 w-16 rounded-full shrink-0" />
      </div>
    </div>
  )
}

export function GameCardSkeleton() {
  return (
    <div className="card mb-3 overflow-hidden">
      <div className="h-1.5 bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1.5">
            <Bone className="h-4 w-40" />
            <Bone className="h-3 w-28" />
          </div>
          <Bone className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Bone className="w-8 h-8 rounded-full shrink-0" />
          <Bone className="h-3 w-24" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-6 w-14 rounded-full" />
          <Bone className="h-6 w-16 rounded-full" />
          <Bone className="h-6 w-12 rounded-full" />
        </div>
        <Bone className="h-9 w-full rounded-[10px]" />
      </div>
    </div>
  )
}

export function ActivityItemSkeleton() {
  return (
    <div className="flex items-start gap-3 mb-4">
      <Bone className="w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5 pt-1">
        <Bone className="h-3.5 w-full" />
        <Bone className="h-3 w-20" />
      </div>
    </div>
  )
}

export function GameHostCardSkeleton() {
  return (
    <div className="card mb-4 overflow-hidden">
      <div className="h-1.5 bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1.5">
            <Bone className="h-4 w-36" />
            <Bone className="h-3 w-24" />
            <div className="flex gap-1 mt-1">
              <Bone className="h-5 w-12 rounded-full" />
              <Bone className="h-5 w-14 rounded-full" />
            </div>
          </div>
          <Bone className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-9 flex-1 rounded-[8px]" />
          <Bone className="h-9 flex-1 rounded-[8px]" />
        </div>
      </div>
    </div>
  )
}
