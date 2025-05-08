import { KeywordAnalysisResult, CvOptimizationResult } from "@/lib/cv-analyzer";

interface KeywordAnalysisProps {
  analysis: KeywordAnalysisResult | null;
  optimization: CvOptimizationResult | null;
}

export function KeywordAnalysis({ analysis, optimization }: KeywordAnalysisProps) {
  // If no analysis has been done yet
  if (!analysis) {
    return (
      <div className="bg-white rounded-lg p-6 paper-shadow">
        <h2 className="font-display text-lg mb-3">Keyword Analysis</h2>
        <p className="text-sm text-brown mb-4">No job description analyzed yet</p>
      </div>
    );
  }

  const { keywords } = analysis;

  return (
    <div className="bg-white rounded-lg p-6 paper-shadow">
      <h2 className="font-display text-lg mb-3">Keyword Analysis</h2>
      <p className="text-sm text-brown mb-4">
        {keywords.length} key terms identified
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {keywords.map((keyword, index) => (
          <span
            key={index}
            className="inline-block bg-paper py-1 px-3 rounded-full text-xs font-mono"
          >
            {keyword}
          </span>
        ))}
      </div>

      {optimization && (
        <div className="mt-6">
          <h3 className="font-mono text-sm border-b border-brown/20 pb-2 mb-3">
            Keyword Match Analysis
          </h3>

          <div className="space-y-3">
            <div className="text-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="font-mono text-xs">Present in your CV</span>
                <span className="text-green-600 text-xs">
                  {optimization.matchingKeywords.length}/{keywords.length} keywords
                </span>
              </div>
              <div className="w-full bg-paper rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width: `${(optimization.matchingKeywords.length / keywords.length) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            <div className="text-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="font-mono text-xs">Missing from your CV</span>
                <span className="text-red-600 text-xs">
                  {optimization.missingKeywords.length}/{keywords.length} keywords
                </span>
              </div>
              <div className="w-full bg-paper rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{
                    width: `${(optimization.missingKeywords.length / keywords.length) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
