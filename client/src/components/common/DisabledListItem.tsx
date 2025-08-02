import React from 'react';

interface DisabledListItemProps {
  /** Có disable item hay không */
  disabled?: boolean;
  /** Nội dung bên trong li */
  children: React.ReactNode;
  /** Class name tùy chỉnh */
  className?: string;
  /** Click handler */
  onClick?: (event: React.MouseEvent<HTMLLIElement>) => void;
  /** Các props khác cho thẻ li */
  [key: string]: any;
}

/**
 * Component wrapper cho thẻ li với khả năng disable
 *
 * Cách sử dụng:
 * ```tsx
 * <DisabledListItem
 *   disabled={!isConditionMet}
 *   onClick={handleClick}
 * >
 *   Nội dung item
 * </DisabledListItem>
 * ```
 */
const DisabledListItem: React.FC<DisabledListItemProps> = ({
  disabled = false,
  children,
  className = '',
  onClick,
  ...props
}) => {
  const handleClick = (event: React.MouseEvent<HTMLLIElement>) => {
    // Nếu disabled thì không thực hiện onClick
    if (disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    // Nếu có onClick handler thì gọi
    if (onClick) {
      onClick(event);
    }
  };

  const combinedClassName = `${className} ${disabled ? 'disabled' : ''}`.trim();

  return (
    <li className={combinedClassName} onClick={handleClick} {...props}>
      {children}
    </li>
  );
};

export default DisabledListItem;
