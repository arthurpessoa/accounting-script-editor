import { ActionNode } from './ActionNode';
import { PaymentNode } from './PaymentNode';
import { SubflowNode } from './SubflowNode';

export const nodeTypes = {
  payment: PaymentNode,
  action: ActionNode,
  subflow: SubflowNode
};
