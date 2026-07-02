export type MergeStateAction<TState> =
  | Partial<TState>
  | ((state: TState) => Partial<TState>);

export function mergeState<TState>(
  state: TState,
  action: MergeStateAction<TState>
): TState {
  const patch =
    typeof action === "function" ? action(state) : action;

  return {
    ...state,
    ...patch
  };
}
