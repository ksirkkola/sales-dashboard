import { HStack, Icon, Th } from '@chakra-ui/react';
import { HailerArrowUp } from '../hailer/theme/icons/HailerArrowUp';

export type SortDirection = 'asc' | 'desc';

export default function SortableTh<T extends string>(props: {
  field: T;
  label: string;
  activeField: T;
  direction: SortDirection;
  onSort: (field: T) => void;
  isNumeric?: boolean;
}) {
  const isActive = props.field === props.activeField;

  return (
    <Th cursor="pointer" onClick={() => props.onSort(props.field)} userSelect="none" isNumeric={props.isNumeric}>
      <HStack spacing={1} justify={props.isNumeric ? 'flex-end' : undefined}>
        <span>{props.label}</span>
        {isActive && (
          <Icon
            as={HailerArrowUp}
            boxSize={3}
            transform={props.direction === 'desc' ? 'rotate(180deg)' : undefined}
          />
        )}
      </HStack>
    </Th>
  );
}
