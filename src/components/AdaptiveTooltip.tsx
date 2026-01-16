import React from "react";
import {Tooltip, Popover, PopoverTrigger, PopoverContent, type TooltipProps, type PopoverProps} from "@heroui/react";
import {useIsTouchDevice} from "@/hooks/useIsTouchDevice";

interface AdaptiveTooltipProps extends Omit<TooltipProps, "content"> {
  content: React.ReactNode;
  children: React.ReactElement;
  popoverProps?: Partial<PopoverProps>;
}

export const AdaptiveTooltip: React.FC<AdaptiveTooltipProps> = (
  {
    content,
    children,
    popoverProps,
    ...rest
  }) => {
  const isTouch = useIsTouchDevice();

  if (isTouch) {
    return (
      <Popover
        placement={rest.placement as any}
        isDisabled={rest.isDisabled}
        {...popoverProps}
      >
        <PopoverTrigger>
          {children}
        </PopoverTrigger>
        <PopoverContent className={rest.classNames?.content as string || rest.className}>
          {content}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Tooltip content={content} {...rest}>
      {children}
    </Tooltip>
  );
};
