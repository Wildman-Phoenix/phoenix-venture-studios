import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Info } from "lucide-react";
import { useFormSecurity } from "@/hooks/useFormSecurity";
import FormSecurityFields from "@/components/FormSecurityFields";

interface CapitalReadinessFormProps {
  onSubmit: (data: Record<string, string>, securityResult?: { disposableEmail?: boolean }) => Promise<void>;
  isSubmitting: boolean;
  prefilledObjective?: string;
}

const FieldHint = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs text-muted-foreground/70 mt-1">{children}</p>
);

const CapitalReadinessForm = ({ onSubmit, isSubmitting, prefilledObjective }: CapitalReadinessFormProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    state: "",
    founderRole: "",
    ventureStage: "",
    capitalObjective: prefilledObjective || "",
    fundingRange: "",
    timeline: "",
    creditStrength: "",
    revenueRange: "",
    hasEntity: "",
    capitalGoals: "",
    marketingConsent: "false",
  });

  // ── SECURITY: honeypot + turnstile + server-side validation ──
  const {
    honeypot, setHoneypot, turnstileRef, validateSubmission, isValidating, hasTurnstile
  } = useFormSecurity("capital_readiness");

  useEffect(() => {
    if (!prefilledObjective) return;

    setFormData((prev) =>
      prefilledObjective === prev.capitalObjective
        ? prev
        : { ...prev, capitalObjective: prefilledObjective }
    );
  }, [prefilledObjective]);

  const update = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── SECURITY: validate before submitting ──
    const validation = await validateSubmission(formData.email);
    if (!validation.valid) return;

    onSubmit(formData, { disposableEmail: validation.disposableEmail });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 relative">
      {/* ── SECURITY: honeypot + Turnstile fields ── */}
      <FormSecurityFields honeypot={honeypot} setHoneypot={setHoneypot} turnstileRef={turnstileRef} hasTurnstile={hasTurnstile} />

      {/* Contact Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input id="name" required value={formData.name} onChange={e => update("name", e.target.value)} placeholder="Your full name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" required value={formData.email} onChange={e => update("email", e.target.value)} placeholder="you@example.com" />
          <FieldHint>We'll use this to follow up with your results and next steps.</FieldHint>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone (Optional)</Label>
          <Input id="phone" type="tel" value={formData.phone} onChange={e => update("phone", e.target.value)} placeholder="(555) 123-4567" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State *</Label>
          <Input id="state" required value={formData.state} onChange={e => update("state", e.target.value)} placeholder="e.g., California" />
          <FieldHint>Some funding options are state-specific.</FieldHint>
        </div>
      </div>

      {/* Founder Role */}
      <div className="space-y-2">
        <Label>Founder Role *</Label>
        <Select required value={formData.founderRole} onValueChange={v => update("founderRole", v)}>
          <SelectTrigger><SelectValue placeholder="Select your role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="founder">Founder</SelectItem>
            <SelectItem value="co-founder">Co-Founder</SelectItem>
            <SelectItem value="operator">Operator</SelectItem>
            <SelectItem value="investor">Investor</SelectItem>
            <SelectItem value="advisor">Advisor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Venture Stage */}
      <div className="space-y-2">
        <Label>Venture Stage *</Label>
        <Select required value={formData.ventureStage} onValueChange={v => update("ventureStage", v)}>
          <SelectTrigger><SelectValue placeholder="Select your venture stage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="early-traction">Early Traction</SelectItem>
            <SelectItem value="stable-growing">Stable and Growing</SelectItem>
            <SelectItem value="scaling-rapidly">Scaling Rapidly</SelectItem>
          </SelectContent>
        </Select>
        <FieldHint>This helps us understand which capital structures might be relevant for you.</FieldHint>
      </div>

      {/* Capital Objective */}
      <div className="space-y-2">
        <Label>Capital Objective *</Label>
        <Select required value={formData.capitalObjective} onValueChange={v => update("capitalObjective", v)}>
          <SelectTrigger><SelectValue placeholder="What will capital be used for?" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="launch-expansion">Launch or Expansion</SelectItem>
            <SelectItem value="growth-capital">Growth Capital</SelectItem>
            <SelectItem value="improve-cash-flow">Improve Cash Flow</SelectItem>
            <SelectItem value="working-capital">Working Capital</SelectItem>
          </SelectContent>
        </Select>
        <FieldHint>Choose the option that best reflects what this capital would actually help you do.</FieldHint>
      </div>

      {/* Funding Range */}
      <div className="space-y-2">
        <Label>Funding Range *</Label>
        <Select required value={formData.fundingRange} onValueChange={v => update("fundingRange", v)}>
          <SelectTrigger><SelectValue placeholder="Select funding range" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="25k-100k">$25k – $100k</SelectItem>
            <SelectItem value="100k-500k">$100k – $500k</SelectItem>
            <SelectItem value="500k-2m">$500k – $2M</SelectItem>
            <SelectItem value="2m-plus">$2M+</SelectItem>
          </SelectContent>
        </Select>
        <FieldHint>We currently focus on U.S.-based capital requests of $25k and above.</FieldHint>
      </div>

      {/* Deployment Timeline */}
      <div className="space-y-2">
        <Label>Deployment Timeline *</Label>
        <Select required value={formData.timeline} onValueChange={v => update("timeline", v)}>
          <SelectTrigger><SelectValue placeholder="When do you need capital?" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="immediately">Immediately</SelectItem>
            <SelectItem value="within-90-days">Within 90 Days</SelectItem>
            <SelectItem value="within-6-months">Within 6 Months</SelectItem>
            <SelectItem value="exploring">Exploring Options</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Credit Strength */}
      <div className="space-y-2">
        <Label>Credit Strength Range *</Label>
        <Select required value={formData.creditStrength} onValueChange={v => update("creditStrength", v)}>
          <SelectTrigger><SelectValue placeholder="Select credit range" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="720-plus">720+</SelectItem>
            <SelectItem value="680-720">680 – 720</SelectItem>
            <SelectItem value="640-680">640 – 680</SelectItem>
            <SelectItem value="below-640">Below 640</SelectItem>
            <SelectItem value="prefer-not-to-say">Prefer Not to Say</SelectItem>
          </SelectContent>
        </Select>
        <FieldHint>This helps us avoid pointing you toward lenders that would be a poor fit. Not a credit check.</FieldHint>
      </div>

      {/* Monthly Revenue */}
      <div className="space-y-2">
        <Label>Monthly Revenue *</Label>
        <Select required value={formData.revenueRange} onValueChange={v => update("revenueRange", v)}>
          <SelectTrigger><SelectValue placeholder="Select revenue range" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="under-10k">Under $10k</SelectItem>
            <SelectItem value="10k-50k">$10k – $50k</SelectItem>
            <SelectItem value="50k-250k">$50k – $250k</SelectItem>
            <SelectItem value="250k-plus">$250k+</SelectItem>
          </SelectContent>
        </Select>
        <FieldHint>A quick range helps us match you to realistic funding pathways faster.</FieldHint>
      </div>

      {/* Existing Business Entity */}
      <div className="space-y-2">
        <Label>Existing Business Entity *</Label>
        <Select required value={formData.hasEntity} onValueChange={v => update("hasEntity", v)}>
          <SelectTrigger><SelectValue placeholder="Do you have an entity?" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="yes">Yes</SelectItem>
            <SelectItem value="no">No</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Optional Goals Text */}
      <div className="space-y-2">
        <Label htmlFor="capitalGoals">What would this capital help you accomplish? (Optional)</Label>
        <Textarea
          id="capitalGoals"
          value={formData.capitalGoals}
          onChange={e => update("capitalGoals", e.target.value)}
          placeholder="Tell us briefly what you're working on and how capital would help..."
          rows={3}
        />
        <FieldHint>Even a sentence or two helps us point you in the right direction.</FieldHint>
      </div>

      {/* Marketing Consent */}
      <div className="flex items-start space-x-3">
        <Checkbox 
          id="marketingConsent" 
          checked={formData.marketingConsent === "true"} 
          onCheckedChange={(checked) => update("marketingConsent", checked ? "true" : "false")} 
        />
        <Label htmlFor="marketingConsent" className="font-normal text-xs text-muted-foreground leading-relaxed cursor-pointer">
          I'd like to receive Founder Signal and occasional strategic updates from Phoenix Venture Studios. You can unsubscribe anytime.
        </Label>
      </div>

      <Button type="submit" className="btn-primary w-full py-6 text-base" disabled={isSubmitting || isValidating}>
        {isSubmitting || isValidating ? "Analyzing..." : "Get My Capital Pathway"}
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground text-center">
          By submitting, you agree to be contacted about funding options.
          Your information will only be shared with funding partners if you choose to proceed.
        </p>
        <p className="text-xs text-muted-foreground/60 text-center flex items-center justify-center gap-1">
          <Info className="h-3 w-3" />
          Current funding pathways are focused on U.S.-based lenders and opportunities. Not every applicant will qualify — pathway fit depends on credit, revenue, timing, and business context.
        </p>
      </div>
    </form>
  );
};

export default CapitalReadinessForm;
