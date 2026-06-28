import React, { useState, useCallback, type CSSProperties } from "react";
import { useDropzone } from "react-dropzone";

type SingleImageUploaderProps = {
  initialImageUrl?: string;
  onFileSelected: (file: File) => void;
  /** e.g. "4 / 3", "16 / 9", "1 / 1" */
  aspectRatio?: string;
  /** Label text like other HeroUI Inputs */
  label?: string;
};

export const SingleImageUploader: React.FC<SingleImageUploaderProps> = ({
                                                                          initialImageUrl,
                                                                          onFileSelected,
                                                                          aspectRatio = "16 / 9",
                                                                          label,
                                                                        }) => {
  const [preview, setPreview] = useState<string | null>(initialImageUrl ?? null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!acceptedFiles.length) return;
      const file = acceptedFiles[0];
      onFileSelected(file);
      setPreview(URL.createObjectURL(file));
    },
    [onFileSelected],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
  });

  const boxStyle: CSSProperties = {
    aspectRatio,                // 🔹 fixed aspect ratio
    width: "100%",              // fill parent width
    borderRadius: 4,
    border: "1px dashed rgba(148, 163, 184, 0.8)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundImage: preview ? `url(${preview})` : undefined,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  };

  return (
    <div className="flex flex-col">
      {/* 🔹 Label styled similar to HeroUI Input labelPlacement="outside-top" */}
      {label && (
        <label className="text-sm pb-2 text-foreground">
          {label}
        </label>
      )}

      <div
        {...getRootProps()}
        style={boxStyle}
        className={`
          bg-input
          hover:bg-input
          focus-visible:outline-none
          text-xs text-default-500
        `}
      >
        <input {...getInputProps()} />
        {!preview && (
          <span className="px-2 text-center opacity-80">
            {isDragActive ? "Drop image here…" : "Upload image"}
          </span>
        )}
      </div>
    </div>
  );
};
