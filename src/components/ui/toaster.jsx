import React from "react"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

// Pages pass either a ToastAction element or { label, onClick } (the undo pattern).
function renderAction(action) {
  if (!action) return null
  if (React.isValidElement(action)) return action
  if (typeof action === "object" && action.label) {
    return (
      <ToastAction altText={action.label} onClick={action.onClick}>
        {action.label}
      </ToastAction>
    )
  }
  return null
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {renderAction(action)}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
