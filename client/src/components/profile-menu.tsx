import { useState } from "react";
import { User, Settings, FileText, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getBaseCV, saveBaseCV, formatLastUpdated } from "@/lib/local-storage";
import { uploadCV } from "@/lib/cv-analyzer";
import { useToast } from "@/hooks/use-toast";
import haptics from "@/lib/haptics";

interface ProfileMenuProps {
  onResumeUpdated: (id: number, fileName: string) => void;
}

export function ProfileMenu({ onResumeUpdated }: ProfileMenuProps) {
  const [showResumeEditor, setShowResumeEditor] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleOpenResumeEditor = () => {
    const { content, lastUpdated } = getBaseCV();
    setResumeText(content);
    setShowResumeEditor(true);
    setIsEditing(false);
  };

  const handleSaveResume = async () => {
    if (!resumeText.trim()) {
      toast({
        title: "Resume content required",
        description: "Please enter your resume content before saving",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    haptics.impact();

    try {
      // Create file object for API
      const blob = new Blob([resumeText], { type: "text/plain" });
      const file = new File([blob], "resume.txt", { type: "text/plain" });

      // Upload to server
      const result = await uploadCV(file, resumeText);

      // Save to local storage
      saveBaseCV(resumeText, "resume.txt", result.id);

      // Notify parent component
      onResumeUpdated(result.id, "resume.txt");

      toast({
        title: "Resume updated",
        description: "Your base resume has been updated successfully",
      });

      haptics.success();
      setShowResumeEditor(false);
    } catch (error) {
      toast({
        title: "Failed to update resume",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      haptics.error();
    } finally {
      setIsSaving(false);
    }
  };

  // Check if we have a stored CV
  const { content, lastUpdated } = getBaseCV();
  const hasResume = !!content;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-2 rounded-full hover:bg-white/30 transition-colors duration-200 flex items-center justify-center">
            <Settings className="h-5 w-5 text-brown-dark" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-white border border-brown/30">
          <DropdownMenuLabel className="font-normal text-brown">Profile</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-brown/20" />
          <DropdownMenuItem 
            className="flex items-center gap-2 text-brown cursor-pointer" 
            onClick={handleOpenResumeEditor}
          >
            <FileText className="h-4 w-4" />
            <span>{hasResume ? "Edit Base Resume" : "Set Base Resume"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Resume Editor Dialog */}
      <Dialog open={showResumeEditor} onOpenChange={setShowResumeEditor}>
        <DialogContent className="sm:max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-brown-dark">
              {hasResume ? "Edit Your Base Resume" : "Set Your Base Resume"}
            </DialogTitle>
            <DialogDescription className="text-brown">
              {hasResume 
                ? `Last updated: ${formatLastUpdated(lastUpdated)}`
                : "This will be used as your starting point for all optimizations."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {isEditing ? (
              <Textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                className="w-full h-64 font-mono text-sm p-4"
                placeholder="Paste your resume text here..."
              />
            ) : (
              <div className="relative">
                <div className="absolute top-2 right-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 text-xs"
                  >
                    <Edit className="h-3 w-3" />
                    Edit
                  </Button>
                </div>
                <div className="whitespace-pre-wrap overflow-y-auto h-64 p-4 bg-cream font-mono text-sm border border-brown/30 rounded">
                  {resumeText || (
                    <span className="text-brown-light italic">No resume content available</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowResumeEditor(false)}
              className="border-brown text-brown hover:bg-paper"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveResume}
              disabled={isSaving || !resumeText.trim()}
              className="bg-brown text-white hover:bg-brown-dark flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent"></span>
                  Saving...
                </>
              ) : (
                <>Save Resume</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}