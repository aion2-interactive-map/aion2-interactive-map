import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'

// Importing altcha package will introduce a new element <altcha-widget>
import "altcha/i18n";
import {computeBaseUrl} from "@/utils/dataMode.ts";
import {useTranslation} from "react-i18next";

interface AltchaProps {
  onStateChange?: (ev: Event | CustomEvent) => void
}

async function altchaFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  const json = await res.json();

  // If backend returns { errorCode, errorMessage, showType, data: {...} }
  if (json?.data && typeof json.data === "object") {
    return new Response(JSON.stringify(json.data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // fallback passthrough (keeps debug-friendly behavior)
  return new Response(JSON.stringify(json), {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

const Altcha = forwardRef<{ value: string | null }, AltchaProps>(({ onStateChange }, ref) => {
  const widgetRef = useRef<AltchaWidget & AltchaWidgetMethods & HTMLElement>(null)
  const [value, setValue] = useState<string | null>(null)
  const { i18n } = useTranslation();

  useImperativeHandle(ref, () => {
    return {
      get value() {
        return value
      }
    }
  }, [value])

  useEffect(() => {
    const handleStateChange = (ev: Event | CustomEvent) => {
      if ('detail' in ev) {
        setValue(ev.detail.payload || null)
        onStateChange?.(ev)
      }
    }

    const { current } = widgetRef

    if (current) {
      current.addEventListener('statechange', handleStateChange)
      return () => current.removeEventListener('statechange', handleStateChange)
    }
  }, [onStateChange])

  /* Configure your `challengeurl` and remove the `test` attribute, see docs: https://altcha.org/docs/v2/widget-integration/  */
  return (
    <altcha-widget
      ref={widgetRef}
      style={{
        '--altcha-max-width': '100%',
        width: "100%",
        display: "block",
      }}
      debug
      challengeurl={computeBaseUrl() + "/auth/altcha"}
      customfetch={altchaFetch}
      language={i18n.language.toLowerCase()}
    ></altcha-widget>
  )
})

export default Altcha
