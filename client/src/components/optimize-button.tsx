import { Button } from "@/components/ui/button";
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
      <Button
        id="process-cv"
        className="bg-moss text-white px-6 py-3 rounded font-mono text-md hover:bg-moss-dark transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center mx-auto"
        onClick={onClick}
        disabled={disabled || isProcessing}
      >
        {isProcessing ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </>
        ) : (
          <>
            <Wand2 className="mr-2 h-4 w-4" />
            Optimize CV
          </>
        )}
      </Button>
      <p className="mt-2 text-xs text-brown italic">
        Analyzes and tailors your CV to match job requirements
      </p>
    </div>
  );
}
