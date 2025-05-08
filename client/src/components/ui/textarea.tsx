import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-paper rounded-md border border-brown/30"></div>
      <textarea
        className={cn(
          "relative font-mono min-h-[80px] w-full rounded-md border-2 border-brown/30 bg-transparent px-4 py-3 text-brown-dark text-base placeholder:text-brown/50 focus:outline-none focus:border-brown/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm shadow-inner",
          className
        )}
        ref={ref}
        {...props}
      />
    </div>
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
