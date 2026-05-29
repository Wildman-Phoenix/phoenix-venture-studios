import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckSquare } from "lucide-react";
import SectionHeader from "./SectionHeader";
import FieldHint from "./FieldHint";
import { SectionProps } from "./types";

const ASSET_OPTIONS = [
  { id: "customer-conversations", label: "Customer conversations" },
  { id: "market-research", label: "Market research" },
  { id: "mvp-prototype", label: "MVP or prototype" },
  { id: "defined-offer", label: "Defined offer or service" },
  { id: "paying-customers", label: "Paying customers" },
  { id: "business-entity", label: "Business entity" },
  { id: "website-landing", label: "Website or landing page" },
  { id: "audience", label: "Audience (email list, community, following)" },
  { id: "team", label: "Team" },
  { id: "pitch-deck", label: "Pitch deck" },
  { id: "financial-projections", label: "Financial projections" },
];

const Section2WhatYouHave = ({ formData, update }: SectionProps) => {
  const handleAssetToggle = (id: string, checked: boolean) => {
    const updated = checked
      ? [...formData.assetsInPlace, id]
      : formData.assetsInPlace.filter(a => a !== id);
    update("assetsInPlace", updated);
  };

  return (
    <div>
      <SectionHeader
        number={2}
        title="What You Already Have in Place"
        description="You don't need everything checked off. This just helps us understand what you're working with so we can be more useful."
        hint="Check anything that applies — even partially."
        icon={CheckSquare}
      />

      <div className="space-y-6">
        <div className="space-y-3">
          <Label>What do you already have? <span className="text-muted-foreground font-normal">(Select all that apply)</span></Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ASSET_OPTIONS.map(option => (
              <div key={option.id} className="flex items-center space-x-2">
                <Checkbox
                  id={option.id}
                  checked={formData.assetsInPlace.includes(option.id)}
                  onCheckedChange={(checked) => handleAssetToggle(option.id, checked as boolean)}
                />
                <Label htmlFor={option.id} className="font-normal cursor-pointer text-sm">{option.label}</Label>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Have you already invested money into this? *</Label>
            <Select required value={formData.investedMoney} onValueChange={v => update("investedMoney", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nothing-yet">Nothing yet</SelectItem>
                <SelectItem value="under-5k">Under $5,000</SelectItem>
                <SelectItem value="5k-25k">$5,000 – $25,000</SelectItem>
                <SelectItem value="25k-100k">$25,000 – $100,000</SelectItem>
                <SelectItem value="over-100k">Over $100,000</SelectItem>
              </SelectContent>
            </Select>
            <FieldHint>Helps us understand your commitment level and risk tolerance.</FieldHint>
          </div>

          <div className="space-y-2">
            <Label>How long have you been operating? *</Label>
            <Select required value={formData.operatingDuration} onValueChange={v => update("operatingDuration", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="not-started">Haven't started yet</SelectItem>
                <SelectItem value="under-6-months">Under 6 months</SelectItem>
                <SelectItem value="6-12-months">6 – 12 months</SelectItem>
                <SelectItem value="1-3-years">1 – 3 years</SelectItem>
                <SelectItem value="over-3-years">Over 3 years</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Section2WhatYouHave;
