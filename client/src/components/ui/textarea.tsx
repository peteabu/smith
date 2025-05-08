import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "font-mono min-h-[80px] w-full rounded-md border border-brown/30 bg-paper px-4 py-3 text-brown-dark text-base placeholder:text-brown/50 focus:outline-none focus:border-brown focus-visible:ring-1 focus-visible:ring-brown disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
