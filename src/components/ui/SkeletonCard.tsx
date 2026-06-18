export function SkeletonCard() {
  return (
    <div className="bg-[#141414] border border-borde/40 rounded-xl p-5 animate-pulse">
      <div className="h-4 bg-borde/40 rounded w-2/3 mb-3" />
      <div className="h-24 bg-borde/20 rounded-lg mb-3" />
      <div className="flex gap-2">
        <div className="h-3 bg-borde/30 rounded w-16" />
        <div className="h-3 bg-borde/20 rounded w-12" />
      </div>
    </div>
  )
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }, (_, i) => <SkeletonCard key={i} />)}
    </div>
  )
}
