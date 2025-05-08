import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <div className="relative">
        <div className="absolute inset-0 bg-paper rounded-md border border-brown/30"></div>
        <input
          type={type}
          className={cn(
            "relative font-mono h-10 w-full rounded-md border-2 border-brown/30 bg-transparent px-4 py-2 text-brown-dark text-base placeholder:text-brown/50 focus:outline-none focus:border-brown/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm shadow-inner",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
