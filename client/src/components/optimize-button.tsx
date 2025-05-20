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
  // Simple click handler with no device-specific behavior
  const handleClick = () => {
    onClick();
  };
  return (
    <div className="text-center">
      <button
        id="process-cv"
        className="font-mono text-md py-4 sm:py-3 px-10 border border-brown/70 rounded primary-action-button hover:bg-[#DFCFB1] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center mx-auto animated-button"
        onClick={handleClick}
        disabled={disabled || isProcessing}
      >
        {isProcessing ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-brown-dark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-brown-dark font-bold">Processing...</span>
          </>
        ) : (
          <>
            <Wand2 className="mr-2 h-5 w-5 text-brown-dark" />
            <span className="text-brown-dark font-bold">
              Optimize Resume
            </span>
          </>
        )}
      </button>
      
      <p className="mt-3 text-xs text-brown font-mono">
        Analyzes and tailors your resume to match job requirements
      </p>
    </div>
  );
}
