import type { FileUpload } from '@/app/components/base/features/types'
import { Button } from '@langgenius/dify-ui/button'
import { cn } from '@langgenius/dify-ui/cn'
import { Popover, PopoverContent, PopoverTrigger } from '@langgenius/dify-ui/popover'
import { toast } from '@langgenius/dify-ui/toast'
import { Tooltip, TooltipContent, TooltipTrigger } from '@langgenius/dify-ui/tooltip'
import { memo, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FILE_URL_REGEX } from '../constants'
import FileInput from '../file-input'
import { useFile } from '../hooks'
import { useStore } from '../store'
import { useCaptureWebPage, usePickWebElement } from '../use-embed-bridge'

type FileFromLinkOrLocalProps = {
  showFromLink?: boolean
  showFromLocal?: boolean
  showCaptureWebPage?: boolean
  trigger: (open: boolean) => React.ReactNode
  fileConfig: FileUpload
}
const OrDivider = () => (
  <div className="flex h-7 items-center p-2 system-2xs-medium-uppercase text-text-quaternary">
    <div className="mr-2 h-px w-[93px] bg-linear-to-l from-[rgba(16,24,40,0.08)]" />
    OR
    <div className="ml-2 h-px w-[93px] bg-linear-to-r from-[rgba(16,24,40,0.08)]" />
  </div>
)
const FileFromLinkOrLocal = ({
  showFromLink = true,
  showFromLocal = true,
  showCaptureWebPage = false,
  trigger,
  fileConfig,
}: FileFromLinkOrLocalProps) => {
  const { t } = useTranslation()
  const files = useStore((s) => s.files)
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [showError, setShowError] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isPicking, setIsPicking] = useState(false)
  const { handleLoadFileFromLink, handleLocalFileUpload } = useFile(fileConfig)
  const { captureWebPage } = useCaptureWebPage()
  const { pickElement } = usePickWebElement()
  const disabled = !!fileConfig.number_limits && files.length >= fileConfig.number_limits
  const fileLinkPlaceholder = t(($) => $['fileUploader.pasteFileLinkInputPlaceholder'], {
    ns: 'common',
  })
  /* v8 ignore next -- fallback for a missing i18n key is not reliably testable under the current global translation mocks in the test DOM runtime. @preserve */
  const fileLinkPlaceholderText = fileLinkPlaceholder || ''

  const handleSaveUrl = () => {
    /* v8 ignore next -- guarded by UI-level disabled state (`disabled={!url || disabled}`), not reachable in the current test click flow. @preserve */
    if (!url) return

    if (!FILE_URL_REGEX.test(url)) {
      setShowError(true)
      return
    }
    handleLoadFileFromLink(url)
    setUrl('')
  }

  const uploadHtml = useCallback(
    (html: string, title?: string) => {
      const fileName = (title || '').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'page'
      handleLocalFileUpload(new File([html], `${fileName}.html`, { type: 'text/html' }))
    },
    [handleLocalFileUpload],
  )

  const handleCaptureWebPage = useCallback(async () => {
    setIsCapturing(true)
    try {
      const result = await captureWebPage()
      if (result.status !== 'success' || !result.payload.html) {
        toast.error(t(($) => $['fileUploader.captureWebPageFailed'], { ns: 'common' }))
        return
      }
      uploadHtml(result.payload.html, result.payload.title)
      setOpen(false)
    } finally {
      setIsCapturing(false)
    }
  }, [captureWebPage, t, uploadHtml])

  const handlePickWebElement = useCallback(async () => {
    setIsPicking(true)
    try {
      const result = await pickElement()
      if (result.status === 'cancelled') return
      if (result.status !== 'success' || !result.payload.html) {
        toast.error(t(($) => $['fileUploader.pickWebElementFailed'], { ns: 'common' }))
        return
      }
      uploadHtml(result.payload.html, result.payload.title)
      setOpen(false)
    } finally {
      setIsPicking(false)
    }
  }, [pickElement, t, uploadHtml])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger(open) as React.ReactElement} />
      <PopoverContent
        placement="top"
        sideOffset={4}
        popupClassName="border-none bg-transparent shadow-none"
      >
        <div className="w-[280px] rounded-xl border-[0.5px] border-components-panel-border bg-components-panel-bg-blur p-3 shadow-lg">
          {showFromLink && (
            <>
              <div
                className={cn(
                  'flex h-8 items-center rounded-lg border border-components-input-border-active bg-components-input-bg-active p-1 shadow-xs',
                  showError && 'border-components-input-border-destructive',
                )}
              >
                <input
                  className="mr-0.5 block grow appearance-none bg-transparent px-1 system-sm-regular outline-hidden"
                  placeholder={fileLinkPlaceholderText}
                  value={url}
                  onChange={(e) => {
                    setShowError(false)
                    setUrl(e.target.value.trim())
                  }}
                  disabled={disabled}
                />
                <Button
                  className="shrink-0"
                  size="small"
                  variant="primary"
                  disabled={!url || disabled}
                  onClick={handleSaveUrl}
                >
                  {t(($) => $['operation.ok'], { ns: 'common' })}
                </Button>
              </div>
              {showError && (
                <div className="mt-0.5 body-xs-regular text-text-destructive">
                  {t(($) => $['fileUploader.pasteFileLinkInvalid'], { ns: 'common' })}
                </div>
              )}
            </>
          )}
          {showFromLink && showFromLocal && <OrDivider />}
          {showFromLocal && (
            <Button className="relative w-full" variant="secondary-accent" disabled={disabled}>
              <span className="mr-1 i-ri-upload-cloud-2-line size-4" aria-hidden="true" />
              {t(($) => $['fileUploader.uploadFromComputer'], { ns: 'common' })}
              <FileInput fileConfig={fileConfig} />
            </Button>
          )}
          {showCaptureWebPage && showFromLocal && <OrDivider />}
          {showCaptureWebPage && (
            <div className="flex items-center gap-1">
              <Button
                className="grow"
                variant="secondary-accent"
                disabled={disabled}
                loading={isCapturing}
                onClick={handleCaptureWebPage}
              >
                {!isCapturing && (
                  <span className="mr-1 i-ri-global-line size-4" aria-hidden="true" />
                )}
                {t(($) => $['fileUploader.captureWebPage'], { ns: 'common' })}
              </Button>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      className="w-8 shrink-0 px-0"
                      variant="secondary-accent"
                      aria-label={t(($) => $['fileUploader.pickWebElement'], { ns: 'common' })}
                      disabled={disabled}
                      loading={isPicking}
                      onClick={handlePickWebElement}
                    >
                      {!isPicking && (
                        <span className="i-ri-dropper-line size-4" aria-hidden="true" />
                      )}
                    </Button>
                  }
                />
                <TooltipContent>
                  {t(($) => $['fileUploader.pickWebElement'], { ns: 'common' })}
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default memo(FileFromLinkOrLocal)
