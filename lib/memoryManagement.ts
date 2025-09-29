/**
 * Memory management utilities for React Native
 */

import { useEffect, useRef } from 'react'

// Hook to prevent memory leaks from async operations
export const useAsyncEffect = (
  asyncFn: () => Promise<void>,
  deps: any[],
  cleanup?: () => void
) => {
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    
    const runAsync = async () => {
      try {
        if (isMountedRef.current) {
          await asyncFn()
        }
      } catch (error) {
        if (isMountedRef.current) {
          console.error('Async effect error:', error)
        }
      }
    }

    runAsync()

    return () => {
      isMountedRef.current = false
      cleanup?.()
    }
  }, deps)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  return isMountedRef
}

// Image cache management
export class ImageCacheManager {
  private static cache = new Map<string, string>()
  private static maxSize = 50 // Maximum cached images

  static add(uri: string, base64: string): void {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(uri, base64)
  }

  static get(uri: string): string | undefined {
    return this.cache.get(uri)
  }

  static clear(): void {
    this.cache.clear()
  }

  static remove(uri: string): void {
    this.cache.delete(uri)
  }
}

// Event listener cleanup utility
export class EventListenerManager {
  private listeners: Array<{
    target: any
    event: string
    handler: Function
  }> = []

  add(target: any, event: string, handler: Function): void {
    target.addEventListener(event, handler)
    this.listeners.push({ target, event, handler })
  }

  cleanup(): void {
    this.listeners.forEach(({ target, event, handler }) => {
      target.removeEventListener(event, handler)
    })
    this.listeners = []
  }
}

// Subscription manager for Supabase
export class SubscriptionManager {
  private subscriptions: Array<{ unsubscribe: () => void }> = []

  add(subscription: { unsubscribe: () => void }): void {
    this.subscriptions.push(subscription)
  }

  cleanup(): void {
    this.subscriptions.forEach(sub => {
      try {
        sub.unsubscribe()
      } catch (error) {
        console.error('Error unsubscribing:', error)
      }
    })
    this.subscriptions = []
  }
}

export const globalSubscriptionManager = new SubscriptionManager()
