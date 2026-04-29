/**
 * abort-controller.ts - EPOCH 22: Production-grade AbortController with memory-safe propagation
 *
 * Claude Code-pattern: createAbortController + createChildAbortController with WeakRef
 * for memory-safe parent-child abort propagation.
 */
import { setMaxListeners } from 'events'

const DEFAULT_MAX_LISTENERS = 50

/**
 * Creates an AbortController with proper event listener limits.
 * Prevents MaxListenersExceededWarning when multiple listeners are attached.
 */
export function createAbortController(
  maxListeners: number = DEFAULT_MAX_LISTENERS,
): AbortController {
  const controller = new AbortController()
  setMaxListeners(maxListeners, controller.signal)
  return controller
}

/**
 * Propagates abort from a parent to a weakly-referenced child controller.
 * Both parent and child are weakly held — neither creates a strong reference.
 */
function propagateAbort(
  this: WeakRef<AbortController>,
  weakChild: WeakRef<AbortController>,
): void {
  const parent = this.deref()
  weakChild.deref()?.abort(parent?.signal.reason)
}

/**
 * Removes an abort handler from a weakly-referenced parent signal.
 */
function removeAbortHandler(
  this: WeakRef<AbortController>,
  weakHandler: WeakRef<(...args: unknown[]) => void>,
): void {
  const parent = this.deref()
  const handler = weakHandler.deref()
  if (parent && handler) {
    parent.signal.removeEventListener('abort', handler)
  }
}

/**
 * Creates a child AbortController that aborts when its parent aborts.
 * Aborting the child does NOT affect the parent.
 *
 * Memory-safe: Uses WeakRef so the parent doesn't retain abandoned children.
 */
export function createChildAbortController(
  parent: AbortController,
  maxListeners?: number,
): AbortController {
  const child = createAbortController(maxListeners)

  // Fast path: parent already aborted
  if (parent.signal.aborted) {
    child.abort(parent.signal.reason)
    return child
  }

  const weakChild = new WeakRef(child)
  const weakParent = new WeakRef(parent)
  const handler = propagateAbort.bind(weakParent, weakChild)

  parent.signal.addEventListener('abort', handler, { once: true })

  // Auto-cleanup: remove parent listener when child is aborted
  child.signal.addEventListener(
    'abort',
    removeAbortHandler.bind(weakParent, new WeakRef(handler)),
    { once: true },
  )

  return child
}
