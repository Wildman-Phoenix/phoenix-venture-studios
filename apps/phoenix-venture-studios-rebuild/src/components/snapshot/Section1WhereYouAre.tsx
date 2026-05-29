import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Compass } from "lucide-react";
import SectionHeader from "./SectionHeader";
import FieldHint from "./FieldHint";
import { SectionProps } from "./types";

const Section1WhereYouAre = ({ formData, update }: SectionProps) => (
  <div>
    <SectionHeader
      number={1}
      title="Where You Are Now"
      description="Start with the basics. There are no wrong answers here — just give us a sense of where things stand today."
      hint="Keep it high-level if you prefer. The more context you share, the more specific your snapshot will be."
      icon={Compass}
    />

    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Are you building something new or growing something existing? *</Label>
        <Select required value={formData.buildingOrGrowing} onValueChange={v => update("buildingOrGrowing", v)}>
          <SelectTrigger><SelectValue placeholder="Select one" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="building-new">Building something new</SelectItem>
            <SelectItem value="growing-existing">Growing something existing</SelectItem>
            <SelectItem value="pivoting">Pivoting or restructuring</SelectItem>
            <SelectItem value="exploring">Still exploring — not sure yet</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>What stage best describes where you are? *</Label>
        <Select required value={formData.ventureStage} onValueChange={v => update("ventureStage", v)}>
          <SelectTrigger><SelectValue placeholder="Select your stage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="idea">Idea — I'm still shaping the concept</SelectItem>
            <SelectItem value="validation">Validation — testing interest or demand</SelectItem>
            <SelectItem value="building">Building — working on the product or offer</SelectItem>
            <SelectItem value="launched">Launched — live and getting traction</SelectItem>
            <SelectItem value="growth">Growth — scaling what's working</SelectItem>
          </SelectContent>
        </Select>
        <FieldHint>Wherever you are is fine. This just helps us calibrate the snapshot.</FieldHint>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Are you currently operating as a business? *</Label>
          <Select required value={formData.currentlyOperating} onValueChange={v => update("currentlyOperating", v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="yes-entity">Yes — registered entity</SelectItem>
              <SelectItem value="yes-informal">Yes — but informally</SelectItem>
              <SelectItem value="in-progress">Setting it up now</SelectItem>
              <SelectItem value="no">Not yet</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Are you currently generating revenue? *</Label>
          <Select required value={formData.generatingRevenue} onValueChange={v => update("generatingRevenue", v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="yes-consistent">Yes — consistent revenue</SelectItem>
              <SelectItem value="yes-early">Yes — early or inconsistent</SelectItem>
              <SelectItem value="pre-revenue">Not yet — pre-revenue</SelectItem>
              <SelectItem value="paused">Previously, but currently paused</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="industry">Industry *</Label>
          <Input id="industry" required value={formData.industry} onChange={e => update("industry", e.target.value)} placeholder="e.g., Technology, Healthcare, Services" />
          <FieldHint>Helps us contextualize your market positioning.</FieldHint>
        </div>
        <div className="space-y-2">
          <Label>Your Role *</Label>
          <Select required value={formData.founderRole} onValueChange={v => update("founderRole", v)}>
            <SelectTrigger><SelectValue placeholder="Select your role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="founder">Founder</SelectItem>
              <SelectItem value="co-founder">Co-Founder</SelectItem>
              <SelectItem value="operator">Operator</SelectItem>
              <SelectItem value="executive">Executive</SelectItem>
              <SelectItem value="advisor">Advisor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  </div>
);

export default Section1WhereYouAre;
