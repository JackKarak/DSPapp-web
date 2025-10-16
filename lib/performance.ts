/**
 * Performance optimization utilities
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// Debounce hook for search and input operations
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value)
    }, delay) as unknown as number

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, delay])

  return debouncedValue
}

// Memoized data processing
export const useOptimizedData = <T, R>(
  data: T[],
  processor: (data: T[]) => R,
  dependencies: any[] = []
): R => {
  return useMemo(() => {
    if (!data || data.length === 0) return processor([])
    return processor(data)
  }, [data, ...dependencies])
}

// Batch operations for better performance
export class BatchProcessor<T> {
  private batch: T[] = []
  private processor: (items: T[]) => Promise<void>
  private timeout: number | null = null
  private batchSize: number
  private delay: number

  constructor(
    processor: (items: T[]) => Promise<void>,
    batchSize: number = 10,
    delay: number = 1000
  ) {
    this.processor = processor
    this.batchSize = batchSize
    this.delay = delay
  }

  add(item: T): void {
    this.batch.push(item)
    
    if (this.batch.length >= this.batchSize) {
      this.flush()
    } else {
      this.scheduleFlush()
    }
  }

  private scheduleFlush(): void {
    if (this.timeout) clearTimeout(this.timeout)
    
    this.timeout = setTimeout(() => {
      this.flush()
    }, this.delay) as unknown as number
  }

  flush(): void {
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }
    
    if (this.batch.length === 0) return
    
    const itemsToProcess = [...this.batch]
    this.batch = []
    
    this.processor(itemsToProcess).catch(error => {
      console.error('Batch processing failed:', error)
    })
  }
}

// Memory-efficient list rendering
export const useVirtualizedList = <T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) => {
  const [scrollOffset, setScrollOffset] = useState(0)
  
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollOffset / itemHeight)
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    )
    
    return { start, end }
  }, [scrollOffset, itemHeight, containerHeight, items.length])
  
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index
    }))
  }, [items, visibleRange])
  
  return {
    visibleItems,
    totalHeight: items.length * itemHeight,
    onScroll: (offset: number) => setScrollOffset(offset),
    paddingTop: visibleRange.start * itemHeight,
    paddingBottom: (items.length - visibleRange.end) * itemHeight
  }
}

// Cache implementation for API calls
export class CacheManager<T> {
  private cache = new Map<string, { data: T; timestamp: number; ttl: number }>()
  
  set(key: string, data: T, ttl: number = 300000): void { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }
  
  get(key: string): T | null {
    const cached = this.cache.get(key)
    
    if (!cached) return null
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data
  }
  
  clear(): void {
    this.cache.clear()
  }
  
  // Clean up expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

export const globalCache = new CacheManager()

// Automatic cleanup every 5 minutes
setInterval(() => {
  globalCache.cleanup()
}, 300000)
