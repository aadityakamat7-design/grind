import React from "react";
import { Lock } from "lucide-react";
import { CATEGORIES } from "@/lib/grind";
import { getMinAgeForCategory } from "@/lib/stateWorkRules";

// Category picker that shows restricted categories as visibly locked with an
// explanation ("Available at 16+ in your state") rather than hiding them.
// Used in the listing form so teens see exactly what they can and can't offer.
export default function CategoryPicker({ value, onChange, state, age, disabled }) {
  return (
    <div className="grid grid-cols-1 gap-2 mt-1">
      {CATEGORIES.map((cat) => {
        const minAge = getMinAgeForCategory(state, cat.value);
        const eligible = age != null && age >= minAge;
        const selected = value === cat.value;
        const isLocked = !eligible;
        return (
          <button
            key={cat.value}
            type="button"
            disabled={isLocked || disabled}
            onClick={() => onChange(cat.value)}
            className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-colors text-left ${
              selected
                ? "border-primary bg-primary/10 text-primary"
                : isLocked
                  ? "border-border bg-muted/50 text-muted-foreground cursor-not-allowed"
                  : "border-border bg-card text-foreground hover:border-primary/30"
            }`}
          >
            <span>{cat.label}</span>
            {isLocked ? (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Lock className="w-3 h-3" />
                Available at {minAge}+
              </span>
            ) : (
              selected && (
                <span className="text-[11px] text-primary font-semibold">
                  {minAge}+ in your state
                </span>
              )
            )}
          </button>
        );
      })}
    </div>
  );
}