function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export function createGuestDragPreview(name: string): HTMLDivElement {
  const preview = document.createElement("div");
  preview.style.position = "fixed";
  preview.style.top = "-9999px";
  preview.style.left = "-9999px";
  preview.style.pointerEvents = "none";
  preview.style.display = "inline-flex";
  preview.style.alignItems = "center";
  preview.style.gap = "8px";
  preview.style.padding = "8px 10px";
  preview.style.border = "1px solid rgb(226 232 240)";
  preview.style.borderRadius = "999px";
  preview.style.background = "white";
  preview.style.boxShadow = "none";
  preview.style.outline = "none";
  preview.style.color = "rgb(24 24 27)";
  preview.style.fontSize = "12px";
  preview.style.fontWeight = "600";
  preview.style.maxWidth = "260px";
  preview.style.overflow = "hidden";

  const avatar = document.createElement("span");
  avatar.textContent = getInitials(name);
  avatar.style.display = "inline-flex";
  avatar.style.alignItems = "center";
  avatar.style.justifyContent = "center";
  avatar.style.width = "24px";
  avatar.style.height = "24px";
  avatar.style.borderRadius = "999px";
  avatar.style.border = "1px solid rgb(147 197 253)";
  avatar.style.background = "rgb(239 246 255)";
  avatar.style.color = "rgb(30 64 175)";
  avatar.style.fontWeight = "700";
  avatar.style.fontSize = "11px";

  const label = document.createElement("span");
  label.textContent = name;
  label.style.whiteSpace = "nowrap";
  label.style.overflow = "hidden";
  label.style.textOverflow = "ellipsis";

  preview.appendChild(avatar);
  preview.appendChild(label);
  document.body.appendChild(preview);

  return preview;
}
