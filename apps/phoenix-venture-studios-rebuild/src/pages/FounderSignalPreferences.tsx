import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ScrollReveal from "@/components/ScrollReveal";
import { CheckCircle2, Send } from "lucide-react";
import FormSecurityFields from "@/components/FormSecurityFields";
import { useFormSecurity } from "@/hooks/useFormSecurity";

const INTEREST_OPTIONS = [
  { id: "funding", label: "Funding & Capital" },
  { id: "ai_tools", label: "AI Tools & Systems" },
  { id: "venture_strategy", label: "Venture Strategy" },
  { id: "market_intelligence", label: "Market Intelligence" },
  { id: "advisory_support", label: "Advisory Support" },
];

const STAGE_OPTIONS = [
  { value: "idea", label: "Idea / Pre-launch" },
  { value: "early", label: "Early Stage (0–$50K revenue)" },
  { value: "growth", label: "Growth ($50K–$500K revenue)" },
  { value: "scaling", label: "Scaling ($500K+ revenue)" },
  { value: "established", label: "Established Business" },
];

const FounderSignalPreferences = () => {
  const [searchParams] = useSearchParams();
  const prefillEmail = searchParams.get("email") || "";
  const { toast } = useToast();

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState(prefillEmail);
  const [whatBuilding, setWhatBuilding] = useState("");
  const [currentStage, setCurrentStage] = useState("");
  const [primaryInterest, setPrimaryInterest] = useState("");
  const [biggestChallenge, setBiggestChallenge] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [interactivePreference, setInteractivePreference] = useState<string>("");
  const [feedback, setFeedback] = useState("");
  const {
    honeypot,
    setHoneypot,
    turnstileRef,
    validateSubmission,
    isValidating,
    hasTurnstile,
  } = useFormSecurity("founder_signal_preferences");

  const toggleInterest = (id: string) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: "Email required", description: "Please enter your email address.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const validation = await validateSubmission(email.trim());
      if (!validation.valid) return;

      const { data: result, error } = await supabase.functions.invoke("submit-form", {
        body: {
          formType: "subscriber_profile",
          data: {
            email: email.trim().toLowerCase(),
            first_name: firstName.trim() || null,
            what_are_you_building: whatBuilding.trim() || null,
            current_stage: currentStage || null,
            primary_interest: primaryInterest.trim() || null,
            biggest_challenge: biggestChallenge.trim() || null,
            interests: interests.length > 0 ? interests : [],
            interactive_newsletter_preference: interactivePreference === "yes",
            feedback: feedback.trim() || null,
            security_form_name: "founder_signal_preferences",
          },
        },
      });

      if (error || result?.error) throw new Error(result?.error || "Save failed");

      setSubmitted(true);
      toast({ title: "Thank you!", description: "Your preferences have been saved." });
    } catch (err) {
      console.error("Preferences submit error:", err);
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <section className="pt-32 pb-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-lg mx-auto text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-heading font-bold text-foreground mb-4">
                You're Shaping The Signal
              </h1>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Thank you for sharing what matters to you. Your input helps us deliver sharper, 
                more relevant intelligence every week.
              </p>
              <a href="/market-intelligence">
                <Button className="btn-primary px-6">
                  Explore Market Intelligence
                </Button>
              </a>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="pt-28 pb-12 md:pt-36 md:pb-16 bg-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-foreground via-foreground to-foreground/95" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <ScrollReveal>
            <div className="max-w-xl mx-auto text-center">
              <p className="text-xs uppercase tracking-[0.15em] text-primary/80 font-semibold mb-3">
                Founder Signal
              </p>
              <h1 className="text-3xl md:text-4xl font-heading font-bold text-background mb-4 leading-tight">
                Help Us Build a Better Briefing
              </h1>
              <p className="text-background/55 leading-relaxed text-sm max-w-md mx-auto">
                Tell us what you're working on and what signals matter most. 
                This takes about 90 seconds and helps us tailor every issue.
              </p>
              <div className="w-9 h-0.5 bg-primary mx-auto mt-6" />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Form */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-8">
              {/* Identity */}
              <div className="space-y-4">
                <h2 className="text-lg font-heading font-semibold text-foreground">About You</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-sm text-muted-foreground">First Name</Label>
                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Your first name" className="h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm text-muted-foreground">Email <span className="text-primary">*</span></Label>
                    <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-11" />
                  </div>
                </div>
              </div>

              {/* What you're building */}
              <div className="space-y-4">
                <h2 className="text-lg font-heading font-semibold text-foreground">What You're Building</h2>
                <div className="space-y-1.5">
                  <Label htmlFor="whatBuilding" className="text-sm text-muted-foreground">
                    Briefly describe your venture or business
                  </Label>
                  <Textarea
                    id="whatBuilding"
                    value={whatBuilding}
                    onChange={(e) => setWhatBuilding(e.target.value)}
                    placeholder="e.g., SaaS platform for property managers, consulting firm expanding into AI..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">Current Stage</Label>
                  <Select value={currentStage} onValueChange={setCurrentStage}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select your stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Interests */}
              <div className="space-y-4">
                <h2 className="text-lg font-heading font-semibold text-foreground">What Signals Matter Most</h2>
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">
                    What would you like to see more of? (select all that apply)
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    {INTEREST_OPTIONS.map((opt) => (
                      <label
                        key={opt.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          interests.includes(opt.id)
                            ? "border-primary/40 bg-primary/5"
                            : "border-border hover:border-primary/20"
                        }`}
                      >
                        <Checkbox
                          checked={interests.includes(opt.id)}
                          onCheckedChange={() => toggleInterest(opt.id)}
                        />
                        <span className="text-sm text-foreground">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="primaryInterest" className="text-sm text-muted-foreground">
                    Your #1 priority right now
                  </Label>
                  <Input
                    id="primaryInterest"
                    value={primaryInterest}
                    onChange={(e) => setPrimaryInterest(e.target.value)}
                    placeholder="e.g., Raising a seed round, building my first product..."
                    className="h-11"
                  />
                </div>
              </div>

              {/* Challenges */}
              <div className="space-y-4">
                <h2 className="text-lg font-heading font-semibold text-foreground">Your Biggest Challenge</h2>
                <div className="space-y-1.5">
                  <Label htmlFor="challenge" className="text-sm text-muted-foreground">
                    What's the hardest part of building right now?
                  </Label>
                  <Textarea
                    id="challenge"
                    value={biggestChallenge}
                    onChange={(e) => setBiggestChallenge(e.target.value)}
                    placeholder="e.g., Finding the right funding, knowing what to prioritize..."
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>

              {/* Interactive preference */}
              <div className="space-y-4">
                <h2 className="text-lg font-heading font-semibold text-foreground">One More Thing</h2>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Would you be interested in a more interactive version of Founder Signal?
                  </Label>
                  <RadioGroup value={interactivePreference} onValueChange={setInteractivePreference} className="flex gap-4 mt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="yes" />
                      <span className="text-sm text-foreground">Yes, I'd love that</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="no" />
                      <span className="text-sm text-foreground">Keep it simple</span>
                    </label>
                  </RadioGroup>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="feedback" className="text-sm text-muted-foreground">
                    Anything else? Suggestions, ideas, feedback welcome.
                  </Label>
                  <Textarea
                    id="feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Optional — but we read every response."
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>

              <FormSecurityFields
                honeypot={honeypot}
                setHoneypot={setHoneypot}
                turnstileRef={turnstileRef}
                hasTurnstile={hasTurnstile}
              />
              <Button type="submit" disabled={loading || isValidating} className="btn-primary w-full h-12 text-sm">
                {loading || isValidating ? "Saving..." : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Preferences
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground/60 text-center">
                Your responses stay private. We use them to improve Founder Signal for you.
              </p>
            </form>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
};

export default FounderSignalPreferences;
