import { writable } from "svelte/store";

interface HoverState {
  hoveredTime: number | null;
  hoveredTimezone: number | null;
}

export const hoverState = writable<HoverState>({
  hoveredTime: null,
  hoveredTimezone: null,
})