import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SKILL_TOPICS } from "@/lib/grind";

// Reusable multi-skill picker used in teen onboarding and profile settings.
// Shows 5 topic dropdowns with popular services + a custom-skill input.
// Selected skills appear as removable chips. The parent owns the `skills`
// string array via the `value` / `onChange` props.
export default function SkillPicker({ value = [], onChange, maxSkills = 30 }) {
  const [customSkill, setCustomSkill] = useState("");
  const [selectKeys, setSelectKeys] = useState({});

  const skills = Array.isArray(value) ? value : [];

  const addSkill = (skill) => {
    const trimmed = skill.trim();
    if (!trimmed || skills.includes(trimmed) || skills.length >= maxSkills) return;
    onChange([...skills, trimmed]);
  };

  const removeSkill = (skill) => {
    onChange(skills.filter((s) => s !== skill));
  };

  const handleTopicSelect = (topicId, skill) => {
    addSkill(skill);
    // Force Select to remount so it resets to the placeholder after each pick
    setSelectKeys((prev) => ({ ...prev, [topicId]: Date.now() }));
  };

  const handleAddCustom = () => {
    if (customSkill.trim()) {
      addSkill(customSkill);
      setCustomSkill("");
    }
  };

  return (
    <div className="space-y-3">
      {/* Selected skills as removable chips */}
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {skills.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20"
            >
              {s}
              <button
                type="button"
                onClick={() => removeSkill(s)}
                className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 5 topic dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {SKILL_TOPICS.map((topic) => (
          <div key={topic.id}>
            <Label className="text-xs text-muted-foreground mb-1">{topic.label}</Label>
            <Select
              key={selectKeys[topic.id] || topic.id}
              value=""
              onValueChange={(val) => handleTopicSelect(topic.id, val)}
            >
              <SelectTrigger className="rounded-xl h-10">
                <SelectValue placeholder="Add a skill…" />
              </SelectTrigger>
              <SelectContent>
                {topic.skills.map((s) => (
                  <SelectItem
                    key={s}
                    value={s}
                    disabled={skills.includes(s)}
                    className={skills.includes(s) ? "opacity-40" : ""}
                  >
                    {s}
                    {skills.includes(s) && " ✓"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      {/* Custom skill input */}
      <div>
        <Label className="text-xs text-muted-foreground mb-1">Add your own skill</Label>
        <div className="flex gap-2">
          <Input
            className="rounded-xl"
            placeholder="e.g. Violin lessons, Babysitting, Photography…"
            value={customSkill}
            maxLength={50}
            onChange={(e) => setCustomSkill(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCustom();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="rounded-xl shrink-0 px-3"
            disabled={!customSkill.trim() || skills.length >= maxSkills}
            onClick={handleAddCustom}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {skills.length >= maxSkills && (
        <p className="text-xs text-muted-foreground">
          Skill limit reached ({maxSkills}). Remove a skill to add another.
        </p>
      )}
    </div>
  );
}