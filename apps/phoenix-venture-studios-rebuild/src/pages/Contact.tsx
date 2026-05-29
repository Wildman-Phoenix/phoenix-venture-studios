import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, CheckCircle2, ArrowRight, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link, useSearchParams } from "react-router-dom";
import advisorImage from "@/assets/advisor-portrait-premium-gpt.jpg";
import { useFormSecurity } from "@/hooks/useFormSecurity";
import FormSecurityFields from "@/components/FormSecurityFields";

const CONTACT_INTENTS = {
  studio: {
    label: "Studio support",
    heading: "Talk through the build with more clarity",
    intro: "Use this when you need help shaping the page, the offer, the rollout, or the execution plan behind the next move.",
    bullets: [
      "What you are building and where the friction is",
      "Whether Phoenix is the right studio partner for the project",
      "What should happen next and what can wait",
      "How the work should be scoped if we move forward",
    ],
    submit: "Request Studio Session",
    success: "We received your studio inquiry and will follow up with the best next step.",
  },
  funding: {
    label: "Funding direction",
    heading: "Get clearer on the right capital conversation",
    intro: "Use this when the question is less about hype and more about what kind of funding path, timing, or readiness work actually fits your situation.",
    bullets: [
      "Your current stage and what you are trying to fund",
      "Which capital path looks most realistic from here",
      "What needs to be clarified before a funding conversation",
      "Whether Phoenix should stay involved after the strategy session",
    ],
    submit: "Request Funding Session",
    success: "We received your funding inquiry and will follow up with the best next step.",
  },
  signal: {
    label: "Founder Signal follow-up",
    heading: "Turn the signal into a better next move",
    intro: "Use this when a Founder Signal or archive story raised a real question about your positioning, AI plan, or capital path.",
    bullets: [
      "What signal caught your attention and why it matters",
      "Where the business decision feels unclear right now",
      "Which path deserves action first",
      "Whether Phoenix should help scope the next move",
    ],
    submit: "Request Strategy Session",
    success: "We received your note and will follow up with the best next step.",
  },
} as const;

const Contact = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const intentKey = searchParams.get("intent") === "studio" || searchParams.get("intent") === "funding" || searchParams.get("intent") === "signal"
    ? (searchParams.get("intent") as keyof typeof CONTACT_INTENTS)
    : "studio";
  const intent = CONTACT_INTENTS[intentKey];
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    businessType: "",
    fundingGoal: "",
    description: "",
    marketingConsent: false
  });

  // ── SECURITY: honeypot + turnstile + server-side validation ──
  const {
    honeypot, setHoneypot, turnstileRef, validateSubmission, isValidating, hasTurnstile
  } = useFormSecurity("contact");

  /**
   * LEAD CAPTURE AUDIT — Contact / Book a Consultation
   * ─────────────────────────────────────────────────────
   * Destination table:  leads
   * Fields saved:       name, email, industry, funding_amount, venture_summary
   * submission_type:    "contact"
   * Security:           honeypot checked, Turnstile verified, rate limited — via validate-form edge function
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // ── SECURITY: validate before saving ──
      const validation = await validateSubmission(formData.email);
      if (!validation.valid) {
        setIsSubmitting(false);
        return;
      }

      const { data: result, error } = await supabase.functions.invoke("submit-form", {
        body: {
          formType: "lead",
          data: {
            name: formData.name,
            email: formData.email,
            industry: formData.businessType,
            funding_amount: formData.fundingGoal,
            venture_summary: formData.description,
            submission_type: `contact_${intentKey}`,
            entry_intent: intentKey,
            marketing_consent: formData.marketingConsent,
            disposable_email: validation.disposableEmail,
          },
        },
      });

      if (error || result?.error) throw new Error(result?.error || "Submission failed");

      setIsSubmitted(true);
      toast({
        title: "Request Received",
        description: intent.success,
      });
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Submission Error",
        description: "There was an issue submitting your request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen pt-24 pb-16 gradient-subtle">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
              Thank You!
            </h1>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              We have your note. Phoenix will review the context you shared and follow up with the clearest next step.
            </p>
            <div className="card-elevated p-6 rounded-xl mb-8">
              <h3 className="font-heading font-semibold text-foreground mb-2">What to expect:</h3>
              <ul className="text-left text-muted-foreground space-y-2 text-sm">
                <li className="flex items-start"><span className="text-primary mr-2">•</span>We will review the context you shared</li>
                <li className="flex items-start"><span className="text-primary mr-2">•</span>You will get the best next step for this inquiry</li>
                <li className="flex items-start"><span className="text-primary mr-2">•</span>If a session makes sense, Phoenix will route you there</li>
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/"><Button variant="outline" className="btn-outline-gold">Return to Homepage</Button></Link>
              <Link to="/snapshot"><Button className="btn-primary">Generate Venture Snapshot<ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16">
      <section className="py-12 md:py-16 gradient-subtle">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Calendar className="mr-2 h-4 w-4" />
              {intent.label}
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-foreground">
              {intent.heading}
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              {intent.intro}
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
              <div className="md:col-span-3">
                <div className="card-elevated p-8 rounded-2xl">
                  <form onSubmit={handleSubmit} className="space-y-6 relative">
                    {/* ── SECURITY: honeypot + Turnstile fields ── */}
                    <FormSecurityFields honeypot={honeypot} setHoneypot={setHoneypot} turnstileRef={turnstileRef} hasTurnstile={hasTurnstile} />

                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input id="name" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Your full name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="you@example.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Business Type *</Label>
                      <Select required value={formData.businessType} onValueChange={(value) => setFormData({ ...formData, businessType: value })}>
                        <SelectTrigger><SelectValue placeholder="Select business type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="startup">Startup / New Venture</SelectItem>
                          <SelectItem value="small-business">Small Business</SelectItem>
                          <SelectItem value="growing-company">Growing Company</SelectItem>
                          <SelectItem value="side-project">Side Project / Idea</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Funding Goal</Label>
                      <Select value={formData.fundingGoal} onValueChange={(value) => setFormData({ ...formData, fundingGoal: value })}>
                        <SelectTrigger><SelectValue placeholder="Select funding goal (optional)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="exploring">Just Exploring Options</SelectItem>
                          <SelectItem value="under-50k">Under $50,000</SelectItem>
                          <SelectItem value="50k-100k">$50,000 - $100,000</SelectItem>
                          <SelectItem value="100k-250k">$100,000 - $250,000</SelectItem>
                          <SelectItem value="250k-500k">$250,000 - $500,000</SelectItem>
                          <SelectItem value="over-500k">Over $500,000</SelectItem>
                          <SelectItem value="not-seeking">Not Seeking Funding</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Brief Description of Need *</Label>
                      <Textarea id="description" required value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Tell us a bit about what you're looking to accomplish..." rows={4} />
                    </div>
                    {/* Marketing Consent */}
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="marketingConsent" 
                        checked={formData.marketingConsent} 
                        onCheckedChange={(checked) => setFormData({ ...formData, marketingConsent: checked as boolean })} 
                      />
                      <Label htmlFor="marketingConsent" className="font-normal text-xs text-muted-foreground leading-relaxed cursor-pointer">
                        I'd like to receive Founder Signal and occasional strategic updates. You can unsubscribe anytime.
                      </Label>
                    </div>

                    <Button type="submit" className="btn-primary w-full py-6 text-base" disabled={isSubmitting || isValidating}>
                      {isSubmitting || isValidating ? "Submitting..." : intent.submit}
                      <Calendar className="ml-2 h-5 w-5" />
                    </Button>

                    <p className="text-xs text-muted-foreground/60 text-center flex items-center justify-center gap-1">
                      <Info className="h-3 w-3" />
                      Current advisory and funding pathways are focused on U.S.-based opportunities.
                    </p>
                  </form>
                </div>
              </div>

              <div className="md:col-span-2">
                <div className="space-y-6">
                  <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-elevated">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(243,108,33,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(18,60,105,0.18),transparent_42%)]" />
                    <div className="relative p-3">
                      <div className="relative overflow-hidden rounded-[1.55rem] border border-white/60 bg-[#e7ded0]">
                        <img
                          src={advisorImage}
                          alt="Nathan Wildman"
                          className="w-full aspect-[4/5] object-cover object-[center_14%] scale-[1.03]"
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,23,39,0.08)_0%,rgba(8,23,39,0)_36%,rgba(8,23,39,0.74)_100%)]" />
                        <div className="absolute left-4 top-4 rounded-full border border-white/30 bg-white/14 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
                          Founder-led
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-5 text-background">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Nathan Wildman</p>
                          <p className="mt-2 font-heading text-2xl font-bold">Practical strategy before expensive mistakes.</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-px border-t border-border/60 bg-border/60">
                      <div className="bg-card px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Phoenix lens</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">Capital, positioning, and build decisions kept grounded.</p>
                      </div>
                      <div className="bg-card px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Approach</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">Clear next steps before more spend, scope, or noise.</p>
                      </div>
                    </div>
                  </div>
                  <div className="card-elevated p-6 rounded-xl">
                    <h3 className="font-heading font-semibold text-foreground mb-4">What we will cover</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {intent.bullets.map((item) => (
                        <li key={item} className="flex items-start"><span className="text-primary mr-2">•</span>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      <strong>Privacy Note:</strong> You do not need to disclose 
                      your venture concept in detail. Share only what you're comfortable sharing.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
