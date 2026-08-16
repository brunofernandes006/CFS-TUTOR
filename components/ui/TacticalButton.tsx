import React from "react";

type TacticalButtonVariant = "primary" | "secondary" | "danger" | "success" | "ghost";
type TacticalButtonSize = "small" | "medium" | "large";

interface TacticalButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: TacticalButtonVariant;
  size?: TacticalButtonSize;
  icon?: React.ReactNode;
  children: React.ReactNode;
  loading?: boolean;
}

const variantStyles = {
  primary:
    "bg-electric-blue text-navy-950 font-bold hover:bg-cyan-glow active:scale-95 disabled:opacity-60",
  secondary:
    "bg-navy-800 text-electric-blue border border-graphite font-semibold hover:bg-navy-700 active:scale-95 disabled:opacity-60",
  danger:
    "bg-alert-red text-white font-bold hover:bg-red-600 active:scale-95 disabled:opacity-60",
  success:
    "bg-success-green text-navy-950 font-bold hover:bg-green-400 active:scale-95 disabled:opacity-60",
  ghost:
    "bg-transparent text-electric-blue border border-electric-blue font-semibold hover:bg-electric-blue/10 active:scale-95 disabled:opacity-60",
};

const sizeStyles = {
  small: "px-3 py-2 text-xs",
  medium: "px-6 py-3 text-sm",
  large: "px-8 py-4 text-base",
};

export function TacticalButton({
  variant = "primary",
  size = "medium",
  icon,
  children,
  loading = false,
  disabled,
  className = "",
  ...props
}: TacticalButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center gap-2 rounded-sm
        transition-all duration-200 ease-out
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <>
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {children}
        </>
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
