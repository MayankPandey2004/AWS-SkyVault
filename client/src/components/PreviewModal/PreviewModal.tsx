import { Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import { Eye } from "lucide-react";
import { useState } from "react";

interface FileItem {
    id: number;
    name: string;
    size: number;
    mimeType: string;
    hash: string;
}

export const PreviewModal = ({ file }: { file: FileItem }) => {
    const [open, setOpen] = useState(false);

    const previewUrl = `http://localhost:4000/preview?key=${encodeURIComponent(file.hash)}`;


    return (
        <>
            {/* Eye Button */}
            <IconButton
                onClick={() => setOpen(true)}
                className="text-blue-400 hover:text-blue-300"
            >
                <Eye className="w-4 h-4" />
            </IconButton>

            {/* Preview Dialog */}
            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    {file.name}
                    <IconButton
                        aria-label="close"
                        onClick={() => setOpen(false)}
                        sx={{ position: "absolute", right: 8, top: 8 }}
                    >
                        ✕
                    </IconButton>
                </DialogTitle>

                <DialogContent>
                    {file.mimeType.startsWith("image/") ? (
                        <img src={previewUrl} alt={file.name} style={{ width: "100%" }} />
                    ) : file.mimeType === "application/pdf" ? (
                        <iframe
                            src={previewUrl}
                            style={{ width: "100%", height: "500px" }}
                            title="PDF Preview"
                        />
                    ) : file.mimeType.startsWith("video/") ? (
                        <video src={previewUrl} controls style={{ width: "100%" }} />
                    ) : file.mimeType.startsWith("audio/") ? (
                        <audio src={previewUrl} controls />
                    ) : (
                        <p>
                            No preview available.{" "}
                            <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                                Download instead
                            </a>
                        </p>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};
