import { Wand2 } from "lucide-react";

interface OptimizeButtonProps {
  disabled: boolean;
  isProcessing: boolean;
  onClick: () => void;
}

export function OptimizeButton({ 
  disabled, 
  isProcessing, 
  onClick 
}: OptimizeButtonProps) {
  return (
    <div className="text-center">
      <div className="relative inline-block">
        {/* Paper texture background for button */}
        <div className="absolute inset-0 bg-paper rounded border border-brown/50"></div>
        
        <button
          id="process-cv"
          className="relative font-mono text-md py-3 px-8 border-2 border-brown/70 rounded bg-white hover:bg-paper transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center mx-auto"
          onClick={onClick}
          disabled={disabled || isProcessing}
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-brown-dark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-brown-dark font-bold tracking-wide">Processing...</span>
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-5 w-5 text-brown-dark" />
              <span className="text-brown-dark font-bold tracking-wide relative">
                Optimize CV
                {/* Typewriter-style underline */}
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brown/30"></span>
              </span>
            </>
          )}
        </button>
        
        {/* Create a shadow effect that looks like typewritten paper */}
        <div className="absolute -bottom-1 -right-1 w-full h-full bg-brown/10 rounded border border-brown/30 -z-10"></div>
      </div>
      
      <p className="mt-3 text-xs text-brown font-mono">
        Analyzes and tailors your CV to match job requirements
      </p>
    </div>
  );
}
