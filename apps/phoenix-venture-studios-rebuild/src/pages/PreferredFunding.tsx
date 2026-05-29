import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, DollarSign, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFormSecurity } from "@/hooks/useFormSecurity";
import FormSecurityFields from "@/components/FormSecurityFields";

const PreferredFunding = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    industry: "",
    businessAge: "",
    monthlyRevenue: "",
    creditRange: "",
    fundingAmount: "",
    fundingTimeline: "",
    notes: "",
  });

  // ── SECURITY: honeypot + turnstile + server-side validation ──
  const {
    honeypot, setHoneypot, turnstileRef, validateSubmission, isValidating, hasTurnstile
  } = useFormSecurity("preferred_funding");

  const update = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  /**
   * LEAD CAPTURE AUDIT — Preferred Funding Group
   * Security: honeypot checked, Turnstile verified, rate limited — via validate-form edge function
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
            phone: formData.phone || null,
            industry: formData.industry,
            funding_amount: formData.fundingAmount,
            timeline_to_launch: formData.fundingTimeline,
            credit_strength: formData.creditRange,
            venture_summary: [
              `Company: ${formData.companyName}`,
              `Business Age: ${formData.businessAge}`,
              `Monthly Revenue: ${formData.monthlyRevenue}`,
              formData.notes ? `Notes: ${formData.notes}` : null,
            ].filter(Boolean).join("\n"),
            submission_type: "preferred_funding",
            lead_source: "preferred_funding_group",
            disposable_email: validation.disposableEmail,
          },
        },
      });

      if (error || result?.error) throw new Error(result?.error || "Submission failed");

      setIsSubmitted(true);
      toast({ title: "Submission Received", description: "Our team will review your details." });
    } catch (error) {
      console.error("Error submitting:", error);
      toast({ title: "Submission Error", description: "Please try again.", variant: "destructive" });
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
              Thank You
            </h1>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Your submission has been received. Our team will review your information and follow up if additional steps are appropriate.
            </p>
            <Button onClick={() => window.location.href = "/funding"} className="btn-primary">
              Return to Funding Path
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <section className="py-12 md:py-16 gradient-subtle">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <DollarSign className="mr-2 h-4 w-4" />
              Unsecured Business Funding
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-foreground">
              Preferred Funding Qualification
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Provide a few details so we can determine whether unsecured funding programs may be a fit for your business.
              These programs are currently focused on U.S.-based businesses and lender criteria.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className="card-elevated p-8 rounded-2xl">
              <form onSubmit={handleSubmit} className="space-y-6 relative">
                {/* ── SECURITY: honeypot + Turnstile fields ── */}
                <FormSecurityFields honeypot={honeypot} setHoneypot={setHoneypot} turnstileRef={turnstileRef} hasTurnstile={hasTurnstile} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" required value={formData.name} onChange={(e) => update("name", e.target.value)} placeholder="Your full name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input id="email" type="email" required value={formData.email} onChange={(e) => update("email", e.target.value)} placeholder="you@company.com" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" type="tel" value={formData.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(555) 123-4567" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input id="companyName" required value={formData.companyName} onChange={(e) => update("companyName", e.target.value)} placeholder="Your company name" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Industry *</Label>
                  <Select required value={formData.industry} onValueChange={(v) => update("industry", v)}>
                    <SelectTrigger><SelectValue placeholder="Select your industry" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="retail">Retail / E-Commerce</SelectItem>
                      <SelectItem value="services">Professional Services</SelectItem>
                      <SelectItem value="construction">Construction</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="food-beverage">Food & Beverage</SelectItem>
                      <SelectItem value="real-estate">Real Estate</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Business Age *</Label>
                    <Select required value={formData.businessAge} onValueChange={(v) => update("businessAge", v)}>
                      <SelectTrigger><SelectValue placeholder="How long operating?" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="startup">Startup (under 1 year)</SelectItem>
                        <SelectItem value="1-3">1–3 years</SelectItem>
                        <SelectItem value="3-5">3–5 years</SelectItem>
                        <SelectItem value="5-plus">5+ years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Monthly Revenue Range *</Label>
                    <Select required value={formData.monthlyRevenue} onValueChange={(v) => update("monthlyRevenue", v)}>
                      <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pre-revenue">Pre-Revenue</SelectItem>
                        <SelectItem value="under-25k">Under $25,000</SelectItem>
                        <SelectItem value="25k-100k">$25,000 – $100,000</SelectItem>
                        <SelectItem value="100k-500k">$100,000 – $500,000</SelectItem>
                        <SelectItem value="500k-plus">$500,000+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Credit Range *</Label>
                    <Select required value={formData.creditRange} onValueChange={(v) => update("creditRange", v)}>
                      <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under-650">Under 650</SelectItem>
                        <SelectItem value="650-700">650 – 700</SelectItem>
                        <SelectItem value="700-740">700 – 740</SelectItem>
                        <SelectItem value="740-plus">740+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Funding Amount Requested *</Label>
                    <Select required value={formData.fundingAmount} onValueChange={(v) => update("fundingAmount", v)}>
                      <SelectTrigger><SelectValue placeholder="Select amount" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under-50k">Under $50,000</SelectItem>
                        <SelectItem value="50k-150k">$50,000 – $150,000</SelectItem>
                        <SelectItem value="150k-500k">$150,000 – $500,000</SelectItem>
                        <SelectItem value="500k-plus">$500,000+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Funding Timeline *</Label>
                  <Select required value={formData.fundingTimeline} onValueChange={(v) => update("fundingTimeline", v)}>
                    <SelectTrigger><SelectValue placeholder="When do you need funding?" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediately">Immediately</SelectItem>
                      <SelectItem value="30-days">Within 30 days</SelectItem>
                      <SelectItem value="90-days">Within 90 days</SelectItem>
                      <SelectItem value="exploring">Exploring options</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Optional Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    placeholder="Tell us about your funding goals or business needs."
                    rows={4}
                  />
                </div>

                <Button type="submit" className="btn-primary w-full py-6 text-base" disabled={isSubmitting || isValidating}>
                  {isSubmitting || isValidating ? "Submitting..." : "Submit Qualification Request"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Our team will review your information and determine whether unsecured funding programs may be an appropriate pathway.
                  Not every applicant will qualify — pathway fit depends on credit, revenue, and business context.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PreferredFunding;
