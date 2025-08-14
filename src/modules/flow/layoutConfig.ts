// Centralized layout & sizing constants for the Flow Editor
// Adjust here instead of sprinkling magic numbers across components.

export const LAYOUT = {
  paymentRoot: { x: 40, y: 40 },
  subflowGrid: {
    marginX: 50,
    marginY: 50,
    gapX: 80,
    gapY: 80
  },
  subflowSize: {
    padding: 30,
    minWidth: 300,
    minHeight: 200
  },
  actionLayout: {
    nodeWidth: 160,
    nodeHeight: 70, // reserved if needed for future calculations
    gapX: 40,
    gapY: 90,
    innerPaddingX: 40,
    startY: 140
  }
} as const;

export type LayoutConfig = typeof LAYOUT;
