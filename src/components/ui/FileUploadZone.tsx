import { useRef, useState, useCallback } from "react";
import { X, FileText, Film, File } from "lucide-react";

interface UploadedFile {
  file: File;
  previewUrl: string | null;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PreviewCard({ uf, onRemove }: { uf: UploadedFile; onRemove: () => void }) {
  const { file, previewUrl } = uf;
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  const isPdf = file.type === "application/pdf";

  return (
    <div style={{ position: "relative", width: 72, flexShrink: 0 }}>
      <div style={{
        width: 72, height: 72, borderRadius: 8,
        background: "#1a1a1a", border: "1px solid #2a2a2a",
        overflow: "hidden", display: "flex",
        alignItems: "center", justifyContent: "center",
      }}>
        {isImage && previewUrl ? (
          <img src={previewUrl} alt={file.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : isVideo ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <Film size={24} color="#888" />
            <div style={{
              width: 20, height: 20, borderRadius: "50%",
              border: "2px solid #555",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ width: 0, height: 0, borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderLeft: "8px solid #888", marginLeft: 2 }} />
            </div>
          </div>
        ) : isPdf ? (
          <FileText size={28} color="#ef4444" />
        ) : (
          <File size={28} color="#888" />
        )}
      </div>

      <button
        onClick={onRemove}
        style={{
          position: "absolute", top: -6, right: -6,
          width: 18, height: 18, borderRadius: "50%",
          background: "#ef4444", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
        }}
        aria-label="Remove file"
      >
        <X size={10} color="#fff" strokeWidth={3} />
      </button>

      <p style={{
        fontSize: 10, color: "#aaa", marginTop: 4, lineHeight: 1.3,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 72,
      }}>
        {file.name}
      </p>
      <p style={{ fontSize: 10, color: "#666", margin: 0 }}>{formatBytes(file.size)}</p>
    </div>
  );
}

interface FileUploadZoneProps {
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  accept?: string;
  maxFiles?: number;
  label?: string;
}

export type { UploadedFile };

export function FileUploadZone({
  files, onChange, accept = "*/*", maxFiles = 10,
  label = "Drag & drop files here, or click to browse",
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const remaining = maxFiles - files.length;
    const newEntries: UploadedFile[] = Array.from(incoming).slice(0, remaining).map((file) => ({
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }));
    onChange([...files, ...newEntries]);
  }, [files, maxFiles, onChange]);

  const removeFile = useCallback((index: number) => {
    const url = files[index].previewUrl;
    if (url) URL.revokeObjectURL(url);
    onChange(files.filter((_, i) => i !== index));
  }, [files, onChange]);

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        style={{
          border: `2px dashed ${dragging ? "#22c55e" : "#2a2a2a"}`,
          borderRadius: 10, padding: "28px 20px", textAlign: "center",
          cursor: "pointer", background: dragging ? "#0d1f13" : "#111111",
          transition: "border-color 0.15s, background 0.15s",
        }}
      >
        <p style={{ fontSize: 13, color: "#888", margin: 0 }}>{label}</p>
        <p style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
          {accept === "*/*" ? "Any file type" : accept} · max {maxFiles} files
        </p>
      </div>

      <input ref={inputRef} type="file" multiple accept={accept} style={{ display: "none" }}
        onChange={(e) => addFiles(e.target.files)} />

      {files.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 16 }}>
          {files.map((uf, i) => (
            <PreviewCard key={`${uf.file.name}-${i}`} uf={uf} onRemove={() => removeFile(i)} />
          ))}
        </div>
      )}
    </div>
  );
}
