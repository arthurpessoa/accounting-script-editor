import { create } from 'zustand';
interface GraphState {
  nodesJson: string | null;
  setNodesJson: (json: string) => void;
}

export const useScriptStore = create<GraphState>((set) => ({
  nodesJson: null,
  setNodesJson: (json) => set({ nodesJson: json })
}));
