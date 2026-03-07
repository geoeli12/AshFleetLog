import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, Loader2 } from "lucide-react";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

export default function ImageUpload({ label, value, onChange, onImageAnalyzed }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Store as a data URL (base64) so the feature works without Base44/Supabase Storage wiring.
      // If you later add a real upload endpoint, you can swap this out.
      const dataUrl = await fileToDataUrl(file);
      onChange(dataUrl);

      // Optional hook: callers can run their own analysis/OCR
      if (typeof onImageAnalyzed === "function") {
        try { onImageAnalyzed(dataUrl); } catch { /* ignore */ }
      }
    } finally {
      setUploading(false);
      // allow re-uploading same file
      e.target.value = "";
    }
  };

  const clearImage = () => onChange(null);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearImage}
            className="text-slate-500 hover:text-red-600"
            type="button"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="relative rounded-xl border border-slate-200 bg-white p-3">
        {value ? (
          <div className="relative">
            <img
              src={value}
              alt={label}
              className="w-full max-h-48 object-contain rounded-lg bg-slate-50"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 rounded-lg bg-slate-50 border border-dashed border-slate-200">
            <div className="text-center">
              <Camera className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No image uploaded</p>
            </div>
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <input
            id={`upload-${label}`}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          <label htmlFor={`upload-${label}`} className="flex-1">
            <Button
              variant="outline"
              className="w-full rounded-xl"
              disabled={uploading}
              type="button"
              asChild
            >
              <span>
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </span>
            </Button>
          </label>
        </div>
      </div>
    </div>
  );
}
