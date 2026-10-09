import { ActionIcon, type MantineColor, Tooltip } from "@mantine/core";
import type { IconHome2 } from "@tabler/icons-react";
import { Link, type To } from "react-router";
import IconWrapper from "./IconWrapper";

type Props = {
  label: string;
  icon: typeof IconHome2;
  color?: MantineColor;
  size?: number;
  loading?: boolean;
  disabled?: boolean;
} & (
  | { to: To; href?: never; onClick?: never }
  | { href: string; to?: never; onClick?: never }
  | { onClick: () => void; to?: never; href?: never }
);

export function RowAction({ label, icon, color, size = 18, loading, disabled, to, href, onClick }: Props) {
  const content = <IconWrapper icon={icon} size={size} />;
  const common = { variant: "subtle", color, loading, disabled, "aria-label": label } as const;

  return (
    <Tooltip label={label}>
      {to !== undefined ? (
        <ActionIcon component={Link} to={to} {...common}>
          {content}
        </ActionIcon>
      ) : href !== undefined ? (
        <ActionIcon component="a" href={href} {...common}>
          {content}
        </ActionIcon>
      ) : (
        <ActionIcon onClick={onClick} {...common}>
          {content}
        </ActionIcon>
      )}
    </Tooltip>
  );
}
