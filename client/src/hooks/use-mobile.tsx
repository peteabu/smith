import * as React from "react"

const MOBILE_BREAKPOINT = 768

// Changed to a more descriptive name that implies responsive design
// rather than device detection
export function useIsSmallScreen() {
  const [isSmallScreen, setIsSmallScreen] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsSmallScreen(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsSmallScreen(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isSmallScreen
}

// Keep the original function for backward compatibility
export function useIsMobile() {
  return useIsSmallScreen()
}
