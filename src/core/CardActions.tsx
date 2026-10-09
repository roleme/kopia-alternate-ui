import { Button, type MantineColor } from "@mantine/core";
import type { IconHome2 } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Link, type To } from "react-router";
import classes from "./CardActions.module.css";

export function CardActions({ children }: { children: ReactNode }) {
  return <div className={classes.actions}>{children}</div>;
}

type Props = {
  icon: typeof IconHome2;
  label: string;
  ariaLabel?: string;
  color?: MantineColor;
  loading?: boolean;
  disabled?: boolean;
} & ({ onClick: () => void; to?: never } | { to: To; onClick?: never });

export function CardButton({ icon: Icon, label, ariaLabel, color, loading, disabled, to, onClick }: Props) {
  const common = {
    variant: "light",
    size: "sm",
    color,
    loading,
    disabled,
    leftSection: <Icon size={16} />,
    "aria-label": ariaLabel ?? label,
    classNames: { root: classes.action, section: classes.actionSection }
  } as const;
  const content = <span className={classes.actionLabel}>{label}</span>;

  return to !== undefined ? (
    <Button component={Link} to={to} {...common}>
      {content}
    </Button>
  ) : (
    <Button onClick={onClick} {...common}>
      {content}
    </Button>
  );
}
