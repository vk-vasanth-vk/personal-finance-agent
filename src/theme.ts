export const colors = {
  brand: "#1B7FD0",
  brandDark: "#0F5FA3",
  brandSoft: "#E8F3FC",
  brandMuted: "#A9D0EF",
  ink: "#0F172A",
  inkSecondary: "#475569",
  inkMuted: "#94A3B8",
  surface: "#FFFFFF",
  canvas: "#F4F7FA",
  border: "#E2E8F0",
  danger: "#C0352B",
  dangerSoft: "#FCEBEA",
  success: "#1F7A4D",
  successSoft: "#E6F5EE",
  warning: "#B45309",
  warningSoft: "#FEF3C7",
};

export function formatMoney(amount: number): string {
  const formatted = amount.toLocaleString("en-IN", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `₹${formatted}`;
}

export function formatShortDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}
