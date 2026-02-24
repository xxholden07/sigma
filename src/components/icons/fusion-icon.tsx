import type { SVGProps } from "react";

export function FusionIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="M12 22c-3.314 0-6-4.477-6-10S8.686 2 12 2" />
      <path d="M22 12c0 3.314-4.477 6-10 6s-10-2.686-10-6" />
      <path d="M12 12l4 4" />
      <path d="M12 12l-4-4" />
    </svg>
  );
}
