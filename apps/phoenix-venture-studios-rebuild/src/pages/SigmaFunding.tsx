import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle2, Receipt, Building, DollarSign, Clock, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ScrollReveal from "@/components/ScrollReveal";
import { useFormSecurity } from "@/hooks/useFormSecurity";
import FormSecurityFields from "@/components/FormSecurityFields";

const caseStudies = [
  { company: "Cosmetics & Consumer Products Company", capacity: "$2,000,000 per month" },
  { company: "Medical Products Distributor", capacity: "$600,000 per month" },
  { company: "Oil & Gas Parts Distributor", capacity: "$1,500,000 per month" },
  { company: "Commercial Cleaning / Facilities Management", capacity: "$450,000 per month" },
];

const SigmaFunding = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    website: "",
    industry: "",
    invoicesB2B: "",
    monthlyInvoices: "",
    paymentTerms: "",
    yearsOperating: "",
    invoicesToBusinesses: "",
    capitalTimeline: "",
    fundingNeed: "",
    notes: "",
  });

  const update = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  // ── SECURITY: honeypot + turnstile + server-side validation ──
  const {
    honeypot, setHoneypot, turnstileRef, validateSubmission, isValidating, hasTurnstile
  } = useFormSecurity("sigma_factoring");

  /**
   * LEAD CAPTURE AUDIT — Sigma / Invoice Financing
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
            funding_amount: formData.fundingNeed,
            timeline_to_launch: formData.capitalTimeline,
            venture_summary: [
              `Company: ${formData.companyName}`,
              formData.website ? `Website: ${formData.website}` : null,
              `Invoices B2B: ${formData.invoicesB2B}`,
              `Monthly Invoices: ${formData.monthlyInvoices}`,
              `Payment Terms: ${formData.paymentTerms}`,
              `Years Operating: ${formData.yearsOperating}`,
              `Invoices to Businesses: ${formData.invoicesToBusinesses}`,
              formData.notes ? `Notes: ${formData.notes}` : null,
            ].filter(Boolean).join("\n"),
            submission_type: "sigma_factoring",
            lead_source: "invoice_financing",
            disposable_email: validation.disposableEmail,
          },
        },
      });

      if (error || result?.error) throw new Error(result?.error || "Submission failed");

      // ── SECURITY: skip notifications for disposable emails ──
      if (!validation.disposableEmail) {
        try {
          await supabase.functions.invoke("sigma-lead-notify", {
            body: { ...formData },
          });
        } catch (notifyError) {
          console.error("Notification error (non-blocking):", notifyError);
        }
      }

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
              Your submission has been received. Our team will review your business information and determine whether invoice financing may be an appropriate funding pathway. We will contact you if additional steps are appropriate.
            </p>
            <Button onClick={() => window.location.href = "/"} className="btn-primary">
              Return to Homepage
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Hero */}
      <section className="py-12 md:py-16 gradient-subtle">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Receipt className="mr-2 h-4 w-4" />
              Accounts Receivable Financing
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-foreground">
              Accounts Receivable Funding Qualification
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Provide a few details about your business so we can determine if invoice funding may be a fit.
              This program is currently focused on U.S.-based B2B businesses with existing receivables.
            </p>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className="card-elevated p-8 rounded-2xl">
              <form onSubmit={handleSubmit} className="space-y-8 relative">
                {/* ── SECURITY: honeypot + Turnstile fields ── */}
                <FormSecurityFields honeypot={honeypot} setHoneypot={setHoneypot} turnstileRef={turnstileRef} hasTurnstile={hasTurnstile} />
                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Building className="h-5 w-5 text-primary" /> Contact Information
                  </h3>
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
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input id="phone" type="tel" required value={formData.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(555) 123-4567" />
                  </div>
                </div>

                {/* Company Information */}
                <div>
                  <h3 className="text-lg font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Building className="h-5 w-5 text-primary" /> Company Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name *</Label>
                      <Input id="companyName" required value={formData.companyName} onChange={(e) => update("companyName", e.target.value)} placeholder="Your company name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Business Website (Optional)</Label>
                      <Input id="website" value={formData.website} onChange={(e) => update("website", e.target.value)} placeholder="https://example.com" />
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label>Industry *</Label>
                    <Select required value={formData.industry} onValueChange={(v) => update("industry", v)}>
                      <SelectTrigger><SelectValue placeholder="Select your industry" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="transportation">Transportation / Trucking</SelectItem>
                        <SelectItem value="staffing">Staffing / Recruiting</SelectItem>
                        <SelectItem value="consulting">Consulting / Professional Services</SelectItem>
                        <SelectItem value="distribution">Distribution / Wholesale</SelectItem>
                        <SelectItem value="janitorial">Janitorial / Facilities</SelectItem>
                        <SelectItem value="it-services">IT Services</SelectItem>
                        <SelectItem value="construction">Construction</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Accounts Receivable Details */}
                <div>
                  <h3 className="text-lg font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" /> Accounts Receivable Details
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Do you invoice other businesses? *</Label>
                      <RadioGroup required value={formData.invoicesB2B} onValueChange={(v) => update("invoicesB2B", v)} className="flex gap-6">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="b2b-yes" />
                          <Label htmlFor="b2b-yes" className="font-normal">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="b2b-no" />
                          <Label htmlFor="b2b-no" className="font-normal">No</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="space-y-2">
                      <Label>Average monthly invoices issued *</Label>
                      <Select required value={formData.monthlyInvoices} onValueChange={(v) => update("monthlyInvoices", v)}>
                        <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="under-50k">Under $50,000</SelectItem>
                          <SelectItem value="50k-250k">$50,000 – $250,000</SelectItem>
                          <SelectItem value="250k-500k">$250,000 – $500,000</SelectItem>
                          <SelectItem value="500k-1m">$500,000 – $1M</SelectItem>
                          <SelectItem value="1m-plus">$1M+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Average payment terms *</Label>
                      <Select required value={formData.paymentTerms} onValueChange={(v) => update("paymentTerms", v)}>
                        <SelectTrigger><SelectValue placeholder="Select terms" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="net-15">Net 15</SelectItem>
                          <SelectItem value="net-30">Net 30</SelectItem>
                          <SelectItem value="net-45">Net 45</SelectItem>
                          <SelectItem value="net-60">Net 60</SelectItem>
                          <SelectItem value="net-90">Net 90</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Business Status */}
                <div>
                  <h3 className="text-lg font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" /> Business Status
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>How long has the business been operating? *</Label>
                      <Select required value={formData.yearsOperating} onValueChange={(v) => update("yearsOperating", v)}>
                        <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="under-1">Startup (under 1 year)</SelectItem>
                          <SelectItem value="1-3">1–3 years</SelectItem>
                          <SelectItem value="3-5">3–5 years</SelectItem>
                          <SelectItem value="5-plus">5+ years</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Are invoices issued to other businesses (not consumers)? *</Label>
                      <RadioGroup required value={formData.invoicesToBusinesses} onValueChange={(v) => update("invoicesToBusinesses", v)} className="flex gap-6">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="yes" id="inv-biz-yes" />
                          <Label htmlFor="inv-biz-yes" className="font-normal">Yes</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="no" id="inv-biz-no" />
                          <Label htmlFor="inv-biz-no" className="font-normal">No</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </div>

                {/* Funding Need */}
                <div>
                  <h3 className="text-lg font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" /> Funding Need
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>How quickly do you need working capital? *</Label>
                      <Select required value={formData.capitalTimeline} onValueChange={(v) => update("capitalTimeline", v)}>
                        <SelectTrigger><SelectValue placeholder="Select timeline" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immediately">Immediately</SelectItem>
                          <SelectItem value="30-days">Within 30 days</SelectItem>
                          <SelectItem value="90-days">Within 90 days</SelectItem>
                          <SelectItem value="exploring">Exploring options</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Estimated funding need *</Label>
                      <Select required value={formData.fundingNeed} onValueChange={(v) => update("fundingNeed", v)}>
                        <SelectTrigger><SelectValue placeholder="Select amount" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="under-100k">Under $100k</SelectItem>
                          <SelectItem value="100k-500k">$100k – $500k</SelectItem>
                          <SelectItem value="500k-1m">$500k – $1M</SelectItem>
                          <SelectItem value="1m-plus">$1M+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Optional Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    placeholder="Tell us anything about your business or funding goals."
                    rows={4}
                  />
                </div>

                <Button type="submit" className="btn-primary w-full py-6 text-base" disabled={isSubmitting || isValidating}>
                  {isSubmitting || isValidating ? "Submitting..." : "Submit Qualification Request"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Our team will review your business information and determine whether invoice financing may be an appropriate funding pathway.
                  Not every applicant will qualify — eligibility depends on invoice volume, payment terms, and business context.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Case Studies */}
      <section className="py-12 md:py-16 bg-secondary/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <ScrollReveal>
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground text-center mb-8">
                Recent Invoice Funding Examples
              </h2>
            </ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {caseStudies.map((cs, i) => (
                <ScrollReveal key={i} delay={i * 0.1}>
                  <div className="card-elevated p-5 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Receipt className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-heading font-semibold text-foreground text-sm">{cs.company}</h3>
                        <p className="text-primary font-medium text-sm mt-1">Funding Capacity: {cs.capacity}</p>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground mt-6">
              These demonstrate how accounts receivable financing can scale with business growth.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SigmaFunding;
