import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import SectionHeader from "./SectionHeader";
import FieldHint from "./FieldHint";
import { SectionProps } from "./types";

const Section3Challenges = ({ formData, update }: SectionProps) => (
  <div>
    <SectionHeader
      number={3}
      title="What's Getting in the Way"
      description="Everyone hits walls. Understanding where you're stuck helps us figure out what kind of support would actually move the needle."
      hint="Be as honest as you'd like — there's no judgment here."
      icon={AlertCircle}
    />

    <div className="space-y-6">
      <div className="space-y-2">
        <Label>What feels like the biggest challenge right now? *</Label>
        <Select required value={formData.biggestChallenge} onValueChange={v => update("biggestChallenge", v)}>
          <SelectTrigger><SelectValue placeholder="Select your biggest challenge" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="funding-capital">Finding or accessing capital</SelectItem>
            <SelectItem value="clarity-direction">Clarity on direction or strategy</SelectItem>
            <SelectItem value="revenue-traction">Getting revenue or traction</SelectItem>
            <SelectItem value="building-product">Building the product or service</SelectItem>
            <SelectItem value="marketing-visibility">Marketing and visibility</SelectItem>
            <SelectItem value="team-capacity">Team or capacity constraints</SelectItem>
            <SelectItem value="overwhelm">Feeling overwhelmed or unsure where to start</SelectItem>
            <SelectItem value="other">Something else entirely</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="alreadyTried">What have you already tried? <span className="text-muted-foreground font-normal">(Optional)</span></Label>
        <Textarea
          id="alreadyTried"
          value={formData.alreadyTried}
          onChange={e => update("alreadyTried", e.target.value)}
          placeholder="e.g., applied for loans, tried crowdfunding, hired consultants, bootstrapped..."
          rows={3}
        />
        <FieldHint>Knowing what you've already explored helps us avoid suggesting what hasn't worked.</FieldHint>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hardestPart">What has been the hardest part so far? <span className="text-muted-foreground font-normal">(Optional)</span></Label>
        <Textarea
          id="hardestPart"
          value={formData.hardestPart}
          onChange={e => update("hardestPart", e.target.value)}
          placeholder="A sentence or two is plenty."
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>What feels most urgent right now? *</Label>
        <Select required value={formData.mostUrgent} onValueChange={v => update("mostUrgent", v)}>
          <SelectTrigger><SelectValue placeholder="What's most pressing?" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="need-capital-now">I need capital soon</SelectItem>
            <SelectItem value="need-strategy">I need strategic clarity</SelectItem>
            <SelectItem value="need-both">Both — capital and clarity</SelectItem>
            <SelectItem value="exploring">I'm exploring, nothing urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  </div>
);

export default Section3Challenges;
