import { CheckCircle2, ArrowRight, Calendar, Target, DollarSign, Clock, Shield, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import type { MatchResult } from "@/config/capital-pathways";

interface CapitalMatchResultsProps {
  result: MatchResult;
}

const CapitalMatchResults = ({ result }: CapitalMatchResultsProps) => {
  const { pathway, confidence, note } = result;

  const confidenceLabel = {
    strong: "Strong Match",
    moderate: "Good Fit",
    exploratory: "Exploratory",
  }[confidence];

  const confidenceColor = {
    strong: "bg-green-500/10 text-green-600",
    moderate: "bg-primary/10 text-primary",
    exploratory: "bg-muted text-muted-foreground",
  }[confidence];

  return (
    <div className="min-h-screen pt-24 pb-16 gradient-subtle">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Target className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-2">
              Your Capital Pathway
            </h1>
            <p className="text-muted-foreground">
              Based on your responses, here's what we recommend.
            </p>
          </div>

          {/* Recommended Label */}
          <div className="text-center mb-4">
            <span className="text-xs font-medium uppercase tracking-wider text-primary">
              Recommended Based on Your Responses
            </span>
          </div>

          {/* Result Card */}
          <div className="card-elevated p-8 rounded-2xl mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-heading font-bold text-foreground">
                {pathway.name}
              </h2>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${confidenceColor}`}>
                {confidenceLabel}
              </span>
            </div>

            <p className="text-muted-foreground leading-relaxed mb-3">
              {pathway.description}
            </p>

            <p className="text-xs text-muted-foreground/70 mb-6">
              This recommendation is based on your stage, timeline, credit profile, and revenue signals.
            </p>

            {note && (
              <div className="bg-secondary/50 rounded-lg p-4 mb-6 text-sm text-muted-foreground">
                <Shield className="inline h-4 w-4 text-primary mr-2" />
                {note}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Estimated Funding Range</p>
                  <p className="text-sm font-semibold text-foreground">{pathway.fundingRange}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Estimated Timeline</p>
                  <p className="text-sm font-semibold text-foreground">{pathway.estimatedTimeline}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Credit Requirement</p>
                  <p className="text-sm font-semibold text-foreground">{pathway.creditRequirement}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Revenue Requirement</p>
                  <p className="text-sm font-semibold text-foreground">{pathway.revenueRequirement}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              {pathway.applyUrl.startsWith("http") ? (
                <a href={pathway.applyUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                  <Button className="btn-primary w-full py-5 text-base">
                    Apply Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </a>
              ) : (
                <Link to={pathway.applyUrl} className="w-full">
                  <Button className="btn-primary w-full py-5 text-base">
                    Apply Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              )}
              {pathway.bookStrategyUrl.startsWith("http") ? (
                <a href={pathway.bookStrategyUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                  <Button variant="outline" className="btn-outline-gold w-full py-5">
                    Book Strategy Session
                    <Calendar className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              ) : (
                <Link to={pathway.bookStrategyUrl} className="w-full">
                  <Button variant="outline" className="btn-outline-gold w-full py-5">
                    Book Strategy Session
                    <Calendar className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground/60 mb-8 px-2">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <p>
              Final funding eligibility depends on lender review and documentation, but this gives you the strongest likely next step based on the information provided.
            </p>
          </div>

          {/* What Happens Next */}
          <div className="card-elevated p-6 rounded-xl text-left">
            <h3 className="font-heading font-semibold text-foreground mb-4">
              What happens next?
            </h3>
            <ul className="text-muted-foreground space-y-3 text-sm">
              <li className="flex items-start">
                <span className="text-primary mr-2 mt-0.5 font-semibold">1.</span>
                Our team reviews your submission and confirms your pathway alignment
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2 mt-0.5 font-semibold">2.</span>
                You'll receive a follow-up with next steps and any relevant partner introductions
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2 mt-0.5 font-semibold">3.</span>
                If you're ready, you can schedule a strategy call to discuss your options in detail
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CapitalMatchResults;
