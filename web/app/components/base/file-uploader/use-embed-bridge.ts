import { useCallback } from 'react'
import { isClient } from '@/utils/client'

export const REQUEST_PAGE_HTML = 'dify-chatbot-request-page-html'
export const PAGE_HTML_RESPONSE = 'dify-chatbot-page-html'
export const START_ELEMENT_PICK = 'dify-chatbot-pick-element-start'
export const ELEMENT_PICKED = 'dify-chatbot-element-picked'
export const ELEMENT_PICK_CANCELLED = 'dify-chatbot-element-pick-cancelled'

const PAGE_HTML_TIMEOUT = 15000
const ELEMENT_PICK_TIMEOUT = 180000

export type BridgePayload = {
  html?: string
  title?: string
  url?: string
  error?: string
}

export type BridgeResult =
  | { status: 'success'; payload: BridgePayload }
  | { status: 'cancelled' }
  | { status: 'unavailable' }

const isEmbedded = () => isClient && window.self !== window.top

const getParentOrigin = () => {
  if (!isClient || !document.referrer) return '*'
  try {
    return new URL(document.referrer).origin
  } catch {
    return '*'
  }
}

const requestFromHost = (
  startType: string,
  successType: string,
  cancelType: string | null,
  timeout: number,
): Promise<BridgeResult> => {
  if (!isEmbedded()) return Promise.resolve({ status: 'unavailable' })

  const parentOrigin = getParentOrigin()

  return new Promise<BridgeResult>((resolve) => {
    const state: { timer?: ReturnType<typeof setTimeout> } = {}
    const listener = (event: MessageEvent) => {
      const type = event.data?.type
      if (!type || (type !== successType && type !== cancelType)) return
      if (parentOrigin !== '*' && event.origin !== parentOrigin) return
      if (state.timer) clearTimeout(state.timer)
      window.removeEventListener('message', listener)
      if (type === cancelType) {
        resolve({ status: 'cancelled' })
        return
      }
      resolve({ status: 'success', payload: (event.data.payload ?? {}) as BridgePayload })
    }
    state.timer = setTimeout(() => {
      window.removeEventListener('message', listener)
      resolve({ status: 'unavailable' })
    }, timeout)

    window.addEventListener('message', listener)
    window.parent.postMessage({ type: startType }, parentOrigin)
  })
}

/** Ask the host page (the bubble embed) to send back its own HTML document. */
export const useCaptureWebPage = () => {
  const captureWebPage = useCallback(
    () => requestFromHost(REQUEST_PAGE_HTML, PAGE_HTML_RESPONSE, null, PAGE_HTML_TIMEOUT),
    [],
  )

  return { captureWebPage }
}

/** Let the user pick one element from the host page with the mouse. */
export const usePickWebElement = () => {
  const pickElement = useCallback(
    () =>
      requestFromHost(
        START_ELEMENT_PICK,
        ELEMENT_PICKED,
        ELEMENT_PICK_CANCELLED,
        ELEMENT_PICK_TIMEOUT,
      ),
    [],
  )

  return { pickElement }
}
