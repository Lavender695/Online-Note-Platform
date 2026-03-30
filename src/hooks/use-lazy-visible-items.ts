import { useEffect, useMemo, useRef, useState } from 'react'

type Options = {
  initialCount?: number
  loadMoreCount?: number
  rootMargin?: string
}

export function useLazyVisibleItems<T>(
  items: T[],
  {
    initialCount = 8,
    loadMoreCount = 8,
    rootMargin = '240px 0px',
  }: Options = {}
) {
  const [visibleCount, setVisibleCount] = useState(initialCount)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const visibleItems = useMemo(
    () => items.slice(0, visibleCount),
    [items, visibleCount]
  )
  const hasMore = visibleItems.length < items.length

  useEffect(() => {
    if (!hasMore || !loadMoreRef.current) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting) {
          return
        }

        setVisibleCount((current) =>
          Math.min(current + loadMoreCount, items.length)
        )
      },
      { rootMargin }
    )

    observer.observe(loadMoreRef.current)

    return () => observer.disconnect()
  }, [hasMore, items.length, loadMoreCount, rootMargin])

  return {
    visibleItems,
    hasMore,
    loadMoreRef,
  }
}
