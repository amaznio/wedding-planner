"use client";

import * as React from "react";

import type { ToastProps } from "./toast";

type ToastItem = ToastProps & {
  id: string;
  title?: string;
  description?: string;
};

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 1800;

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return `toast-${count}`;
}

type Action =
  | { type: "ADD"; toast: ToastItem }
  | { type: "REMOVE"; id: string };

type State = {
  toasts: ToastItem[];
};

const listeners: Array<(state: State) => void> = [];
let memoryState: State = { toasts: [] };

function dispatch(action: Action) {
  switch (action.type) {
    case "ADD":
      memoryState = {
        ...memoryState,
        toasts: [action.toast, ...memoryState.toasts].slice(0, TOAST_LIMIT),
      };
      break;
    case "REMOVE":
      memoryState = {
        ...memoryState,
        toasts: memoryState.toasts.filter((toast) => toast.id !== action.id),
      };
      break;
  }

  listeners.forEach((listener) => listener(memoryState));
}

export function toast({
  title,
  description,
  ...props
}: Omit<ToastItem, "id">) {
  const id = genId();
  dispatch({
    type: "ADD",
    toast: {
      ...props,
      id,
      title,
      description,
      open: true,
      onOpenChange: (open) => {
        if (!open) {
          dispatch({ type: "REMOVE", id });
        }
      },
    },
  });

  setTimeout(() => {
    dispatch({ type: "REMOVE", id });
  }, TOAST_REMOVE_DELAY);

  return id;
}

export function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  return {
    ...state,
    toast,
  };
}
