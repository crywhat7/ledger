import { create } from "zustand";
import { getNowHonduras, formatHondurasTime24 } from "@/lib/honduras-time";

interface HondurasTimeState {
  time24: string;
  /** Actualizar time24 (UTC-6). Llamar cada segundo desde el dashboard. */
  tick: () => void;
}

export const useHondurasTimeStore = create<HondurasTimeState>((set) => ({
  time24: formatHondurasTime24(getNowHonduras()),

  tick: () => {
    set({ time24: formatHondurasTime24(getNowHonduras()) });
  },
}));
