import { useCallback } from 'react'
import { isClient } from '@/utils/client'

export const REQUEST_PAGE_HTML = 'dify-chatbot-request-page-html'
export const PAGE_HTML_RESPONSE = 'dify-chatbot-page-html'

const CAPTURE_TIMEOUT = 5000

export type CapturedWebPage = {
  html: string
  title?: string
  url?: string
}

const getParentOrigin = () => {
  if (!isClient || !document.referrer) return '*'
  try {
    return new URL(document.referrer).origin
  } catch {
    return '*'
  }
}

/**
 * Ask the host page (the parent window that embedded this webapp through the
 * chatbot bubble) to serialize itself and send the HTML back. Only available
 * inside the embedded bubble, where the parent implements the bridge protocol.
 */
export const useCaptureWebPage = () => {
  const captureWebPage = useCallback((): Promise<CapturedWebPage | null> => {
    if (!isClient || window.self === window.top) return Promise.resolve(null)

    const parentOrigin = getParentOrigin()

    return new Promise<CapturedWebPage | null>((resolve) => {
      const cleanup = () => {
        clearTimeout(timer)
        window.removeEventListener('message', listener)
      }
      const listener = (event: MessageEvent) => {
        if (event.data?.type !== PAGE_HTML_RESPONSE) return
        if (parentOrigin !== '*' && event.origin !== parentOrigin) return
        cleanup()
        const payload = event.data.payload as (CapturedWebPage & { error?: string }) | undefined
        resolve(payload?.html ? payload : null)
      }
      const timer = setTimeout(() => {
        cleanup()
        resolve(null)
      }, CAPTURE_TIMEOUT)

      window.addEventListener('message', listener)
      window.parent.postMessage({ type: REQUEST_PAGE_HTML }, parentOrigin)
    })
  }, [])

  return { captureWebPage }
}
