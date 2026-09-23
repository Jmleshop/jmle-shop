export default function ConfettiBackground() {
  const dots = [
    { top: "8%", left: "12%", size: 6, color: "#FACC15", opacity: 0.4 },
    { top: "15%", left: "78%", size: 8, color: "#FB923C", opacity: 0.35 },
    { top: "28%", left: "45%", size: 5, color: "#FEF08A", opacity: 0.3 },
    { top: "42%", left: "8%", size: 7, color: "#F97316", opacity: 0.25 },
    { top: "55%", left: "92%", size: 6, color: "#FACC15", opacity: 0.35 },
    { top: "68%", left: "25%", size: 5, color: "#FDBA74", opacity: 0.4 },
    { top: "72%", left: "65%", size: 8, color: "#FB923C", opacity: 0.3 },
    { top: "85%", left: "38%", size: 6, color: "#FEF08A", opacity: 0.35 },
    { top: "90%", left: "82%", size: 5, color: "#F97316", opacity: 0.25 },
    { top: "22%", left: "58%", size: 4, color: "#FACC15", opacity: 0.45 },
    { top: "48%", left: "72%", size: 5, color: "#FB923C", opacity: 0.3 },
    { top: "62%", left: "5%", size: 6, color: "#FDBA74", opacity: 0.35 },
  ];

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {dots.map((dot, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            top: dot.top,
            left: dot.left,
            width: dot.size,
            height: dot.size,
            backgroundColor: dot.color,
            opacity: dot.opacity,
          }}
        />
      ))}
    </div>
  );
}
