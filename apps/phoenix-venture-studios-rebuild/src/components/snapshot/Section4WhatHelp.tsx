import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { HandHeart, Info } from "lucide-react";
import SectionHeader from "./SectionHeader";
import FieldHint from "./FieldHint";
import { SectionProps } from "./types";

const Section4WhatHelp = ({ formData, update }: SectionProps) => (
  <div>
    <SectionHeader
      number={4}
      title="What Kind of Help Makes Sense"
      description="This helps us understand where to point you next — whether that's a conversation, a strategic deep-dive, or a funding pathway."
      hint="There's no commitment here. Just tell us what sounds useful."
      icon={HandHeart}
    />

    <div className="space-y-6">
      <div className="space-y-2">
        <Label>What are you primarily looking for right now? *</Label>
        <Select required value={formData.lookingFor} onValueChange={v => update("lookingFor", v)}>
          <SelectTrigger><SelectValue placeholder="Select what you need most" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="funding-options">Help finding the right funding options</SelectItem>
            <SelectItem value="strategic-guidance">Strategic guidance on my venture</SelectItem>
            <SelectItem value="both-funding-strategy">Both — funding and strategy</SelectItem>
            <SelectItem value="just-exploring">Just getting a feel for what's out there</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Which type of conversation sounds most valuable? *</Label>
        <Select required value={formData.conversationType} onValueChange={v => update("conversationType", v)}>
          <SelectTrigger><SelectValue placeholder="Select conversation type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="quick-discovery">Quick discovery call (free, 15–20 min)</SelectItem>
            <SelectItem value="deep-strategy">Deep strategy session (paid, 60–90 min)</SelectItem>
            <SelectItem value="funding-review">Capital readiness review (focused on funding)</SelectItem>
            <SelectItem value="not-sure">Not sure yet — help me figure it out</SelectItem>
          </SelectContent>
        </Select>
        <FieldHint>Discovery calls are a free, no-pressure starting point. Strategy sessions go deeper and are designed for founders ready to move.</FieldHint>
      </div>

      <div className="space-y-2">
        <Label htmlFor="worthIt">What would make this conversation feel worth it for you? <span className="text-muted-foreground font-normal">(Optional)</span></Label>
        <Textarea
          id="worthIt"
          value={formData.worthIt}
          onChange={e => update("worthIt", e.target.value)}
          placeholder="e.g., clarity on next steps, honest feedback on my plan, understanding my funding options..."
          rows={2}
        />
        <FieldHint>This helps us prepare so the time is genuinely useful for you.</FieldHint>
      </div>

      <div className="space-y-2">
        <Label>Are you looking for guidance only, or support with implementation too? *</Label>
        <Select required value={formData.guidanceOrImplementation} onValueChange={v => update("guidanceOrImplementation", v)}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="guidance-only">Guidance and direction only</SelectItem>
            <SelectItem value="guidance-plus-help">Guidance + some hands-on support</SelectItem>
            <SelectItem value="full-support">Looking for ongoing support and partnership</SelectItem>
            <SelectItem value="not-sure">Not sure yet</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Capital context — kept for scoring */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Funding Target Range *</Label>
          <Select required value={formData.budgetRange} onValueChange={v => update("budgetRange", v)}>
            <SelectTrigger><SelectValue placeholder="How much capital?" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="under-10k">Under $10,000</SelectItem>
              <SelectItem value="10k-25k">$10,000 – $25,000</SelectItem>
              <SelectItem value="25k-50k">$25,000 – $50,000</SelectItem>
              <SelectItem value="50k-100k">$50,000 – $100,000</SelectItem>
              <SelectItem value="100k-250k">$100,000 – $250,000</SelectItem>
              <SelectItem value="over-250k">Over $250,000</SelectItem>
            </SelectContent>
          </Select>
          <FieldHint>Helps align capital pathway recommendations.</FieldHint>
        </div>

        <div className="space-y-2">
          <Label>Credit Strength Range *</Label>
          <Select required value={formData.creditStrength} onValueChange={v => update("creditStrength", v)}>
            <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="under-650">Under 650</SelectItem>
              <SelectItem value="650-700">650 – 700</SelectItem>
              <SelectItem value="700-740">700 – 740</SelectItem>
              <SelectItem value="740-plus">740+</SelectItem>
            </SelectContent>
          </Select>
          <FieldHint>Not a credit check — just helps us avoid poor-fit lender suggestions.</FieldHint>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ventureSummary">Anything else you'd like us to know? <span className="text-muted-foreground font-normal">(Optional)</span></Label>
        <Textarea
          id="ventureSummary"
          value={formData.ventureSummary}
          onChange={e => update("ventureSummary", e.target.value)}
          placeholder="Share as much or as little as feels right. Your concept stays yours."
          rows={3}
        />
      </div>

      <Separator />

      {/* Marketing Consent */}
      <div className="flex items-start space-x-3">
        <Checkbox
          id="marketingConsent"
          checked={formData.marketingConsent}
          onCheckedChange={checked => update("marketingConsent", checked as boolean)}
        />
        <Label htmlFor="marketingConsent" className="font-normal text-xs text-muted-foreground leading-relaxed cursor-pointer">
          I'd like to receive Founder Signal and occasional strategic updates from Phoenix Venture Studios. You can unsubscribe anytime.
        </Label>
      </div>

      <p className="text-xs text-muted-foreground/60 text-center flex items-center justify-center gap-1">
        <Info className="h-3 w-3" />
        Current funding pathways are focused on U.S.-based opportunities. Not every pathway will fit every situation.
      </p>
    </div>
  </div>
);

export default Section4WhatHelp;
